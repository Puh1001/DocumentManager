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
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { CreateKpiAttachmentDto } from "../dto/create-kpi-attachment.dto";
import { KpiAttachmentService } from "../services/kpi-attachment.service";
import { UserDepartmentGuard } from "../guards/user-department.guard";
import { UserWithDepartments } from "../services/user-department.resolver";
import { CurrentUserWithDepartment } from "../decorators/current-user-with-department.decorator";
import { PoliciesGuard } from "@/modules/authorization/guards/policies.guard";
import { CheckPolicies } from "@/modules/authorization/decorators/check-policies.decorator";

@ApiTags("KPI Attachments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserDepartmentGuard, PoliciesGuard)
@Controller("kpi")
export class KpiAttachmentController {
  constructor(private readonly attachmentService: KpiAttachmentService) {}

  @Post("records/:id/attachments")
  @CheckPolicies({ action: "create", subject: "Kpi" })
  @ApiOperation({ summary: "Upload signed KPI PDF attachment" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        folderId: { type: "string", format: "uuid" },
        description: { type: "string" },
        file: {
          type: "string",
          format: "binary",
        },
      },
      required: ["folderId", "file"],
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadAttachment(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Param("id") kpiRecordId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateKpiAttachmentDto
  ) {
    const attachment = await this.attachmentService.uploadAttachment(
      kpiRecordId,
      file,
      body.folderId,
      body.description,
      user
    );

    return {
      id: attachment.id,
      documentId: attachment.documentId,
      description: attachment.description,
      createdAt: attachment.createdAt,
    };
  }

  @Get("records/:id/attachments")
  @CheckPolicies({ action: "view", subject: "Kpi" })
  @ApiOperation({ summary: "List KPI PDF attachments for a KPI record" })
  async listAttachments(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Param("id") kpiRecordId: string
  ) {
    return this.attachmentService.listAttachments(kpiRecordId, user);
  }

  @Delete("attachments/:id")
  @CheckPolicies({ action: "delete", subject: "Kpi" })
  @ApiOperation({ summary: "Delete KPI PDF attachment" })
  async deleteAttachment(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Param("id") attachmentId: string
  ) {
    return this.attachmentService.deleteAttachment(attachmentId, user);
  }

  @Get("attachments/:id/stream")
  @CheckPolicies({ action: "view", subject: "Kpi" })
  @ApiOperation({ summary: "Stream KPI PDF attachment for inline viewing" })
  async streamAttachment(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Param("id") attachmentId: string,
    @Res() res: Response
  ) {
    const stream = await this.attachmentService.getStream(attachmentId, user);
    res.setHeader("Content-Type", "application/pdf");
    stream.pipe(res);
  }

  @Get("attachments/:id/download")
  @CheckPolicies({ action: "download", subject: "Kpi" })
  @ApiOperation({ summary: "Download KPI PDF attachment" })
  async downloadAttachment(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Param("id") attachmentId: string,
    @Res() res: Response
  ) {
    const { buffer, fileName, mimeType } =
      await this.attachmentService.download(attachmentId, user);

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    res.send(buffer);
  }
}
