import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PoliciesGuard } from "@/modules/authorization/guards/policies.guard";
import { CheckPolicies } from "@/modules/authorization/decorators/check-policies.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { Utf8FileFixInterceptor } from "@/common/interceptors/utf8-file.interceptor";
import { Response } from "express";
import { MaintenanceAttachmentService } from "../services/maintenance-attachment.service";
import { AuthenticatedRequest } from "@/common/types/request.types";
import { IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

class UploadAttachmentDto {
  @ApiPropertyOptional({ description: "Description of the attachment" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Original filename (UTF-8, sent as text field)" })
  @IsString()
  @IsOptional()
  fileName?: string;
}

class SubmitDeletionRequestDto {
  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  replacementFileId?: string;
}

@ApiTags("Maintenance Attachments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller("maintenance")
export class MaintenanceAttachmentController {
  constructor(private readonly attachmentService: MaintenanceAttachmentService) {}

  @Post("notices/:id/attachments")
  @CheckPolicies({ action: "create", subject: "Maintenance" })
  @ApiOperation({ summary: "Upload attachment for a maintenance notice" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        description: { type: "string" },
        fileName: { type: "string", description: "Original filename (UTF-8)" },
        file: { type: "string", format: "binary" },
      },
      required: ["file"],
    },
  })
  @UseInterceptors(FileInterceptor("file"), Utf8FileFixInterceptor)
  async uploadAttachment(
    @Req() req: AuthenticatedRequest,
    @Param("id") noticeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadAttachmentDto
  ) {
    const attachment = await this.attachmentService.uploadAttachment(
      noticeId,
      file,
      body.description,
      req.user.id,
      body.fileName
    );

    return {
      id: attachment.id,
      documentId: attachment.documentId,
      description: attachment.description,
      createdAt: attachment.createdAt,
    };
  }

  @Get("notices/:id/attachments")
  @CheckPolicies({ action: "view", subject: "Maintenance" })
  @ApiOperation({ summary: "List attachments for a maintenance notice" })
  async listAttachments(
    @Req() req: AuthenticatedRequest,
    @Param("id") noticeId: string
  ) {
    return this.attachmentService.listAttachments(noticeId, req.user.id);
  }

  @Get("attachments/:id/stream")
  @CheckPolicies({ action: "view", subject: "Maintenance" })
  @ApiOperation({ summary: "Stream attachment for inline viewing" })
  async streamAttachment(
    @Req() req: AuthenticatedRequest,
    @Param("id") attachmentId: string,
    @Res() res: Response
  ) {
    const stream = await this.attachmentService.getStream(attachmentId, req.user.id);
    stream.pipe(res);
  }

  @Get("attachments/:id/download")
  @CheckPolicies({ action: "download", subject: "Maintenance" })
  @ApiOperation({ summary: "Download attachment" })
  async downloadAttachment(
    @Req() req: AuthenticatedRequest,
    @Param("id") attachmentId: string,
    @Res() res: Response
  ) {
    const { buffer, fileName, mimeType } =
      await this.attachmentService.download(attachmentId, req.user.id);

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    res.send(buffer);
  }

  @Get("attachments/:id/deletion-status")
  @CheckPolicies({ action: "view", subject: "Maintenance" })
  @ApiOperation({ summary: "Get deletion status for attachment" })
  async getDeletionStatus(
    @Req() req: AuthenticatedRequest,
    @Param("id") attachmentId: string
  ) {
    return this.attachmentService.getDeletionStatus(attachmentId, req.user.id);
  }

  @Get("attachments/:id/deletion-request")
  @CheckPolicies({ action: "view", subject: "Maintenance" })
  @ApiOperation({ summary: "Get deletion request for attachment" })
  async getDeletionRequest(
    @Req() req: AuthenticatedRequest,
    @Param("id") attachmentId: string
  ) {
    return this.attachmentService.getDeletionRequest(attachmentId, req.user.id);
  }

  @Post("attachments/:id/deletion-request")
  @CheckPolicies({ action: "create", subject: "Maintenance" })
  @ApiOperation({ summary: "Submit deletion request for attachment" })
  async submitDeletionRequest(
    @Req() req: AuthenticatedRequest,
    @Param("id") attachmentId: string,
    @Body() body: SubmitDeletionRequestDto
  ) {
    return this.attachmentService.submitDeletionRequest(
      attachmentId,
      req.user.id,
      body.reason,
      body.replacementFileId
    );
  }

  @Delete("attachments/:id")
  @CheckPolicies({ action: "delete", subject: "Maintenance" })
  @ApiOperation({ summary: "Delete attachment (within 72h window)" })
  async deleteAttachment(
    @Req() req: AuthenticatedRequest,
    @Param("id") attachmentId: string
  ) {
    return this.attachmentService.deleteAttachment(attachmentId, req.user.id);
  }
}
