import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Utf8FileFixInterceptor } from "@/common/interceptors/utf8-file.interceptor";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Response } from "express";
import { Express } from "express";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { DocumentService } from "../services/document.service";
import { QueryDocumentsDto } from "../dto/query-documents.dto";
import { VersionService } from "../services/version.service";
import {
  LocalEditService,
  OpenPathResponse,
} from "../services/local-edit.service";
import { DocumentDeletionService } from "../services/document-deletion.service";
import { SubmitDeletionRequestDto } from "../dto/submit-deletion-request.dto";
import { RenameDocumentDto } from "../dto/rename-document.dto";
import { UpdateIsoMetadataDto } from "../dto/update-iso-metadata.dto";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { AuthenticatedRequest } from "@/common/types/request.types";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { PoliciesGuard } from "@/modules/authorization/guards/policies.guard";
import { CheckPolicies } from "@/modules/authorization/decorators/check-policies.decorator";
import { UsersService } from "@/modules/users/users.service";

@ApiTags("Documents")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller("storage/documents")
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly versionService: VersionService,
    private readonly localEditService: LocalEditService,
    private readonly deletionService: DocumentDeletionService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService
  ) {}

  @Get()
  @ApiOperation({ summary: "List all documents with filters and pagination" })
  async findAll(
    @Query() query: QueryDocumentsDto,
    @Request() req: AuthenticatedRequest
  ) {
    const roles = req.user?.roles ?? [];
    const canSeeAll = roles.some((r) => ["admin", "dcc", "boss"].includes(r));
    let departmentIdsForFilter: string[] | undefined;
    if (!canSeeAll && req.user?.id) {
      try {
        const depts = await this.usersService.getUserDepartments(req.user.id);
        departmentIdsForFilter = depts.map((d) => d.id);
      } catch {
        departmentIdsForFilter = [];
      }
    }
    return this.documentService.findAll({
      status:
        query.status === "ACTIVE" ||
        query.status === "ARCHIVED" ||
        query.status === "DELETED"
          ? query.status
          : undefined,
      departmentId: query.departmentId,
      departmentIdsForFilter,
      level: query.level,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get("search")
  @ApiOperation({ summary: "Search documents" })
  async search(
    @Query("q") query: string,
    @Query("folderId") folderId?: string
  ) {
    return this.documentService.search(query, folderId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get document by ID" })
  async findOne(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    const document = await this.documentService.findById(id);
    await this.ensureDocumentDepartmentAccess(document, req);

    // Create audit log for document view
    if (req.user?.id) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId: req.user.id,
            action: "VIEW",
            resourceType: "Document",
            resourceId: id,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            details: {
              documentName: document.name,
              fileName: document.fileName,
            },
          },
        });
      } catch (error) {
        // Don't fail the request if audit log fails
        console.error("Failed to create audit log:", error);
      }
    }

    return document;
  }

  @Get(":id/permissions")
  @ApiOperation({ summary: "Get document permissions for current user" })
  async getPermissions(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest
  ) {
    const document = await this.documentService.findById(id);
    await this.ensureDocumentDepartmentAccess(document, req);

    const roles = req.user?.roles ?? [];
    const levelCode = document.level?.code;

    // Everyone can view
    const canView = true;

    // Download/Print permissions based on level
    let canDownload = false;
    let canPrint = false;

    if (levelCode === "LEVEL4") {
      // Level 4: everyone can download/print
      canDownload = true;
      canPrint = true;
    } else if (
      levelCode === "LEVEL1" ||
      levelCode === "LEVEL2" ||
      levelCode === "LEVEL3"
    ) {
      // ISO documents (Level 1-3): only DCC and admin
      const hasPermission = roles.some((r) => ["admin", "dcc"].includes(r));
      canDownload = hasPermission;
      canPrint = hasPermission;
    }

    // Edit permission: always false for now (not implemented)
    const canEdit = false;

    return {
      canView,
      canDownload,
      canPrint,
      canEdit,
    };
  }

  @Get(":id/stream")
  @ApiOperation({ summary: "Stream document content for viewer" })
  async stream(
    @Param("id") id: string,
    @Res() res: Response,
    @Request() req: AuthenticatedRequest
  ) {
    const document = await this.documentService.findById(id);
    await this.ensureDocumentDepartmentAccess(document, req);
    const stream = await this.documentService.getStream(id);

    // Create audit log for document view (stream)
    if (req.user?.id) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId: req.user.id,
            action: "VIEW",
            resourceType: "Document",
            resourceId: id,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            details: {
              documentName: document.name,
              fileName: document.fileName,
              action: "stream",
            },
          },
        });
      } catch (error) {
        // Don't fail the request if audit log fails
        console.error("Failed to create audit log:", error);
      }
    }

    // Security headers to prevent download via DevTools
    res.setHeader("Content-Type", this.getMimeType(document.fileType));
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Security-Policy",
      "frame-ancestors 'self'; default-src 'self'"
    );
    stream.pipe(res);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "Download document" })
  async download(
    @Param("id") id: string,
    @Res() res: Response,
    @Request() req: AuthenticatedRequest
  ) {
    const document = await this.documentService.findById(id);
    await this.ensureDocumentDepartmentAccess(document, req);
    await this.ensureDownloadPermission(document, req);
    const { buffer, fileName, mimeType } =
      await this.documentService.download(id);

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  }

  @Post("upload")
  @ApiOperation({ summary: "Upload a new document" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        folderId: { type: "string" },
        levelId: {
          type: "string",
          description: "Document level ID (from GET /storage/document-levels)",
        },
        name: { type: "string" },
        fileName: {
          type: "string",
          description:
            "Original filename (UTF-8, sent as text field to avoid encoding issues)",
        },
        preparerName: {
          type: "string",
          description: "Preparer full name (required for ISO documents)",
        },
        reviewerName: {
          type: "string",
          description: "Reviewer full name (required for ISO documents)",
        },
        approverName: {
          type: "string",
          description: "Approver full name (required for ISO documents)",
        },
        approvalDate: {
          type: "string",
          description: "Approval date ISO 8601 (required for ISO documents)",
        },
        receiptDate: {
          type: "string",
          description: "Receipt date ISO 8601 (required for ISO documents)",
        },
        storageLocation: {
          type: "string",
          description: "Physical storage location (required for ISO documents)",
        },
        documentNo: {
          type: "string",
          description: "Optional business document number (No.)",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"), Utf8FileFixInterceptor)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body("folderId") folderId: string,
    @Body("name") name: string,
    @Request() req: AuthenticatedRequest,
    @Body("fileName") fileName?: string,
    @Body("levelId") levelId?: string,
    @Body("preparerName") preparerName?: string,
    @Body("reviewerName") reviewerName?: string,
    @Body("approverName") approverName?: string,
    @Body("approvalDate") approvalDate?: string,
    @Body("receiptDate") receiptDate?: string,
    @Body("storageLocation") storageLocation?: string,
    @Body("documentNo") documentNo?: string,
    @Body("revisionLabel") revisionLabel?: string
  ) {
    if (!folderId?.trim()) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.FOLDER_REQUIRED,
        "folderId is required"
      );
    }
    if (!levelId?.trim()) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.LEVEL_REQUIRED,
        "levelId is required"
      );
    }
    const roles = req.user?.roles ?? [];
    const canUploadToAnyFolder = roles.some((r) =>
      ["admin", "dcc", "boss"].includes(r)
    );
    let userDepartmentIds: string[] | undefined;
    if (!canUploadToAnyFolder && req.user?.id) {
      try {
        const depts = await this.usersService.getUserDepartments(req.user.id);
        userDepartmentIds = depts.map((d) => d.id);
      } catch {
        userDepartmentIds = [];
      }
    }
    return this.documentService.upload(
      folderId,
      file,
      req.user.id,
      name,
      fileName,
      levelId,
      {
        userDepartmentIds,
        userCanUploadToAnyFolder: canUploadToAnyFolder,
      },
      {
        preparerName: preparerName?.trim() || undefined,
        reviewerName: reviewerName?.trim() || undefined,
        approverName: approverName?.trim() || undefined,
        approvalDate: approvalDate?.trim() || undefined,
        receiptDate: receiptDate?.trim() || undefined,
        storageLocation: storageLocation?.trim() || undefined,
        documentNo: documentNo?.trim() || undefined,
        revisionLabel: revisionLabel?.trim() || undefined,
      }
    );
  }

  @Post(":id/upload-version")
  @ApiOperation({ summary: "Upload a new version of document" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"), Utf8FileFixInterceptor)
  async uploadVersion(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("comment") comment: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.documentService.updateFile(id, file, req.user.id, comment);
  }

  @Patch(":id/archive")
  @ApiOperation({ summary: "Archive document" })
  async archive(@Param("id") id: string) {
    return this.documentService.archive(id);
  }

  @Patch(":id/rename")
  @ApiOperation({ summary: "Rename document" })
  async rename(
    @Param("id") id: string,
    @Body() dto: RenameDocumentDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.documentService.rename(id, dto.name, dto.fileName, req.user.id);
  }

  @Patch(":id/iso-metadata")
  @ApiOperation({
    summary:
      "Update document ISO metadata (level, preparer, reviewer, approver, dates)",
  })
  @CheckPolicies({ action: "edit", subject: "Document" })
  async updateIsoMetadata(
    @Param("id") id: string,
    @Body() dto: UpdateIsoMetadataDto,
    @Request() req: AuthenticatedRequest
  ) {
    const document = await this.documentService.findById(id);
    await this.ensureDocumentDepartmentAccess(document, req);
    return this.documentService.updateIsoMetadata(id, dto, req.user.id);
  }

  // NEW: Deletion workflow endpoints
  @Get(":id/deletion-status")
  @ApiOperation({ summary: "Check deletion status for document" })
  async getDeletionStatus(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.deletionService.checkDeletionStatus(id, req.user.id);
  }

  @Get(":id/deletion-request")
  @ApiOperation({ summary: "Get deletion request for document (if exists)" })
  async getDeletionRequest(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.deletionService.getRequestByDocumentId(id, req.user.id);
  }

  @Post(":id/deletion-requests")
  @ApiOperation({ summary: "Submit deletion request to DCC" })
  async submitDeletionRequest(
    @Param("id") id: string,
    @Body() dto: SubmitDeletionRequestDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.deletionService.submitDeletionRequest(
      id,
      req.user.id,
      dto.reason,
      dto.replacementFileId
    );
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete document (within 72-hour window or with DCC permission)",
  })
  async remove(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.deletionService.selfDelete(id, req.user.id);
  }

  @Get(":id/open-path")
  @ApiOperation({ summary: "Get path to open document in local application" })
  async getOpenPath(@Param("id") id: string): Promise<OpenPathResponse> {
    const document = await this.documentService.findById(id);
    return this.localEditService.getOpenFilePath(document.filePath);
  }

  // Version endpoints
  @Get(":id/versions")
  @ApiOperation({ summary: "List document versions" })
  async listVersions(@Param("id") id: string) {
    return this.versionService.listVersions(id);
  }

  @Get(":id/versions/:version")
  @ApiOperation({ summary: "Get specific version info" })
  async getVersion(@Param("id") id: string, @Param("version") version: number) {
    return this.versionService.getVersion(id, version);
  }

  @Get(":id/versions/:version/download")
  @ApiOperation({ summary: "Download specific version" })
  async downloadVersion(
    @Param("id") id: string,
    @Param("version") version: number,
    @Res() res: Response
  ) {
    const { buffer, fileName } = await this.versionService.downloadVersion(
      id,
      version
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    res.send(buffer);
  }

  @Post(":id/versions/:version/restore")
  @ApiOperation({ summary: "Restore document to specific version" })
  async restoreVersion(
    @Param("id") id: string,
    @Param("version") version: number,
    @Request() req: AuthenticatedRequest
  ) {
    return this.versionService.restoreVersion(id, version, req.user.id);
  }

  /**
   * Ensures the document's folder belongs to one of the user's departments.
   * Admin, dcc, boss bypass. Throws 403 if not allowed.
   */
  private async ensureDocumentDepartmentAccess(
    document: { folder?: { departmentId: string | null } | null },
    req: AuthenticatedRequest
  ): Promise<void> {
    const roles = req.user?.roles ?? [];
    const canSeeAll = roles.some((r) => ["admin", "dcc", "boss"].includes(r));
    if (canSeeAll) return;
    const departmentId = document.folder?.departmentId;
    if (!departmentId) return;
    let userDepartmentIds: string[];
    try {
      const depts = await this.usersService.getUserDepartments(req.user!.id);
      userDepartmentIds = depts.map((d) => d.id);
    } catch {
      userDepartmentIds = [];
    }
    if (!userDepartmentIds.includes(departmentId)) {
      throw CustomException.forbidden(
        ErrorCodes.DOCUMENT.ACCESS_DENIED,
        "Document not in your department"
      );
    }
  }

  /**
   * Check download permission based on document level:
   * - ISO documents (Level 1-3): only DCC and admin can download
   * - Level 4: everyone can download
   */
  private async ensureDownloadPermission(
    document: { level?: { code: string } | null },
    req: AuthenticatedRequest
  ): Promise<void> {
    const levelCode = document.level?.code;
    if (!levelCode) return;

    // Level 4: everyone can download
    if (levelCode === "LEVEL4") return;

    // ISO documents (Level 1-3): only DCC and admin can download
    const roles = req.user?.roles ?? [];
    const canDownload = roles.some((r) => ["admin", "dcc"].includes(r));
    if (!canDownload) {
      throw CustomException.forbidden(
        ErrorCodes.DOCUMENT.ACCESS_DENIED,
        "Only DCC and Admin can download ISO documents (Level 1-3)"
      );
    }
  }

  private getMimeType(fileType: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    return mimeTypes[fileType] || "application/octet-stream";
  }
}
