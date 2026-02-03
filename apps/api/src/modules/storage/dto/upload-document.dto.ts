import { IsString, IsOptional, IsUUID, IsNotEmpty } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Body fields for document upload (multipart/form-data).
 * File is sent as the "file" field separately.
 */
export class UploadDocumentDto {
  @ApiProperty({ description: "Folder ID to upload the document to" })
  @IsString()
  @IsNotEmpty()
  folderId: string;

  @ApiProperty({
    description:
      "Document level ID from GET /storage/document-levels. Required for ISO documents.",
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  levelId: string;

  @ApiPropertyOptional({ description: "Display name for the document" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description:
      "Original filename (UTF-8, sent as text field to avoid encoding issues)",
  })
  @IsOptional()
  @IsString()
  fileName?: string;
}
