import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateKpiAttachmentDto {
  @ApiProperty({
    description: "Target folder ID on SMB-backed storage where the PDF will be stored",
    format: "uuid",
  })
  @IsUUID()
  folderId: string;

  @ApiProperty({
    description: "Optional description for the signed KPI PDF",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}

