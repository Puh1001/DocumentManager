import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, ValidateIf } from "class-validator";

export class CreateKpiAttachmentDto {
  @ApiProperty({
    description:
      "Target folder ID on SMB-backed storage where the PDF will be stored. If not provided, will auto-create department/KPI/current folder structure",
    format: "uuid",
    required: false,
  })
  @ValidateIf(
    (o) => o.folderId !== undefined && o.folderId !== null && o.folderId !== ""
  )
  @IsUUID()
  @IsOptional()
  folderId?: string;

  @ApiProperty({
    description: "Optional description for the signed KPI PDF",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
