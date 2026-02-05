import {
  IsString,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Body fields for document upload (multipart/form-data).
 * File is sent as the "file" field separately.
 * Preparer, reviewer, approver, approvalDate are optional; when omitted, not auto-filled.
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

  @ApiPropertyOptional({
    description: "Preparer full name (required for ISO documents)",
  })
  @IsOptional()
  @IsString()
  preparerName?: string;

  @ApiPropertyOptional({
    description: "Reviewer full name (required for ISO documents)",
  })
  @IsOptional()
  @IsString()
  reviewerName?: string;

  @ApiPropertyOptional({
    description: "Approver full name (required for ISO documents)",
  })
  @IsOptional()
  @IsString()
  approverName?: string;

  @ApiPropertyOptional({
    description: "Approval date ISO 8601 (optional)",
  })
  @IsOptional()
  @IsDateString()
  approvalDate?: string;

  @ApiPropertyOptional({
    description: "Receipt date ISO 8601 (required for ISO documents)",
  })
  @IsOptional()
  @IsDateString()
  receiptDate?: string;

  @ApiPropertyOptional({
    description: "Physical storage location (required for ISO documents)",
  })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional({
    description:
      'Business document number (No.). For example: "BPVN-QESM-001", "BPVN-QEP-001", "BPVN-DCC-SMP-001".',
  })
  @IsOptional()
  @IsString()
  documentNo?: string;

  @ApiPropertyOptional({
    description:
      "Revision label: A/0 (original), A/1..A/10, then B/0..B/10, etc.",
    example: "A/0",
  })
  @IsOptional()
  @IsString()
  revisionLabel?: string;
}
