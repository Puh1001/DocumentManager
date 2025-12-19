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
import { AuthenticatedRequest } from "@/common/types/request.types";

@ApiTags("Documents")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("storage/documents")
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly versionService: VersionService,
    private readonly localEditService: LocalEditService
  ) {}

  @Get(":id")
  @ApiOperation({ summary: "Get document by ID" })
  async findOne(@Param("id") id: string) {
    return this.documentService.findById(id);
  }

  @Get(":id/stream")
  @ApiOperation({ summary: "Stream document content for viewer" })
  async stream(@Param("id") id: string, @Res() res: Response) {
    const document = await this.documentService.findById(id);
    const stream = await this.documentService.getStream(id);

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
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body("folderId") folderId: string,
    @Body("name") name: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.documentService.upload(folderId, file, req.user.id, name);
  }

  @Post(":id/upload-version")
  @ApiOperation({ summary: "Upload a new version of document" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
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

  @Delete(":id")
  @ApiOperation({ summary: "Delete document (soft delete)" })
  async remove(@Param("id") id: string) {
    return this.documentService.delete(id);
  }

  @Get(":id/open-path")
  @ApiOperation({ summary: "Get path to open document in local application" })
  async getOpenPath(@Param("id") id: string): Promise<OpenPathResponse> {
    const document = await this.documentService.findById(id);
    return this.localEditService.getOpenFilePath(document.filePath);
  }

  @Get("search")
  @ApiOperation({ summary: "Search documents" })
  async search(
    @Query("q") query: string,
    @Query("folderId") folderId?: string
  ) {
    return this.documentService.search(query, folderId);
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
