import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PoliciesGuard } from "@/modules/authorization/guards/policies.guard";
import { CheckPolicies } from "@/modules/authorization/decorators/check-policies.decorator";
import { ClientService } from "./client.service";
import { ListClientFilesDto } from "./dto/list-client-files.dto";
import { AuthenticatedRequest } from "@/common/types/request.types";
import { CustomException } from "@/common/errors/custom-exception";
import { Logger } from "@nestjs/common";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

@ApiTags("Client Files")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller("client")
export class ClientController {
  private readonly logger = new Logger(ClientController.name);

  constructor(private readonly clientService: ClientService) {}

  @Get("files/:id/stream")
  @ApiOperation({ summary: "Stream client file for viewer" })
  @CheckPolicies({ action: "view", subject: "Client" })
  async stream(
    @Param("id") id: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    try {
      const { stream, fileType } = await this.clientService.getStream(id);
      const mimeType = MIME_TYPES[fileType] || "application/octet-stream";
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("X-Content-Type-Options", "nosniff");

      stream.on("error", (error) => {
        this.logger.error(`Stream error for file ${id}:`, error.message);
        if (!res.headersSent) {
          res.status(500).json({
            statusCode: 500,
            message: "Failed to stream file",
            error: error.message,
          });
        } else {
          res.destroy();
        }
      });

      res.on("close", () => {
        if (!stream.destroyed) {
          stream.destroy();
        }
      });

      stream.pipe(res);
    } catch (error) {
      if (!res.headersSent) {
        if (error instanceof CustomException) {
          res.status(error.getStatus()).json(error.getResponse());
        } else {
          this.logger.error(`Error streaming file ${id}:`, error);
          res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
          });
        }
      }
    }
  }

  @Get("files")
  @ApiOperation({ summary: "List client files with filters and pagination" })
  @CheckPolicies({ action: "view", subject: "Client" })
  async list(@Query() query: ListClientFilesDto) {
    return this.clientService.list({
      search: query.search,
      fileType: query.fileType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post("files/upload")
  @ApiOperation({ summary: "Upload a file to Client folder" })
  @CheckPolicies({ action: "create", subject: "Client" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clientService.upload(file, req.user!.id);
  }

  @Delete("files/:id")
  @ApiOperation({ summary: "Delete a client file (soft-delete)" })
  @CheckPolicies({ action: "delete", subject: "Client" })
  async delete(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    await this.clientService.delete(id, req.user!.id);
    return { message: "Deleted" };
  }
}
