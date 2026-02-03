import { ApiProperty } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";

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
    description: "Month (1-12) for this attachment. Omitted = current month. Legacy attachments use NULL.",
    minimum: 1,
    maximum: 12,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiProperty({
    description: "Optional description for the signed KPI PDF",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
