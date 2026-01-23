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
import { VersionService } from "../services/version.service";
import {
  LocalEditService,
  OpenPathResponse,
} from "../services/local-edit.service";
import { DocumentDeletionService } from "../services/document-deletion.service";
import { SubmitDeletionRequestDto } from "../dto/submit-deletion-request.dto";
import { RenameDocumentDto } from "../dto/rename-document.dto";
import { AuthenticatedRequest } from "@/common/types/request.types";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { PoliciesGuard } from "@/modules/authorization/guards/policies.guard";

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
    private readonly prisma: PrismaService
  ) {}

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

  @Get(":id/stream")
  @ApiOperation({ summary: "Stream document content for viewer" })
  async stream(
    @Param("id") id: string,
    @Res() res: Response,
    @Request() req: AuthenticatedRequest
  ) {
    const document = await this.documentService.findById(id);
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

    res.setHeader("Content-Type", this.getMimeType(document.fileType));
    res.setHeader("Content-Disposition", "inline");
    stream.pipe(res);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "Download document" })
  async download(@Param("id") id: string, @Res() res: Response) {
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
        name: { type: "string" },
        fileName: { type: "string", description: "Original filename (UTF-8, sent as text field to avoid encoding issues)" },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"), Utf8FileFixInterceptor)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body("folderId") folderId: string,
    @Body("name") name: string,
    @Request() req: AuthenticatedRequest,
    @Body("fileName") fileName?: string
  ) {
    return this.documentService.upload(folderId, file, req.user.id, name, fileName);
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
    return this.documentService.rename(
      id,
      dto.name,
      dto.fileName,
      req.user.id
    );
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
  @ApiOperation({ summary: "Delete document (within 72-hour window or with DCC permission)" })
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
