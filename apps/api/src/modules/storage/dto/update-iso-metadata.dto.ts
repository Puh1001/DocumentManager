import {
  IsOptional,
  IsUUID,
  IsDateString,
  ValidateIf,
  IsString,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateIsoMetadataDto {
  @ApiPropertyOptional({
    description: "Document level ID (from GET /storage/document-levels)",
  })
  @IsOptional()
  @IsUUID()
  levelId?: string;

  @ApiPropertyOptional({ description: "Preparer user ID" })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== "")
  @IsUUID()
  preparerId?: string | null;

  @ApiPropertyOptional({ description: "Reviewer user ID" })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== "")
  @IsUUID()
  reviewerId?: string | null;

  @ApiPropertyOptional({ description: "Approver user ID" })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== "")
  @IsUUID()
  approverId?: string | null;

  @ApiPropertyOptional({
    description: "Approval date (ISO 8601)",
    example: "2026-01-30T00:00:00.000Z",
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== "")
  @IsDateString()
  approvalDate?: string | null;

  @ApiPropertyOptional({
    description: "Receipt date (ISO 8601)",
    example: "2026-01-30T00:00:00.000Z",
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== "")
  @IsDateString()
  receiptDate?: string | null;

  @ApiPropertyOptional({
    description:
      'Business document number (No.). For example: "BPVN-QESM-001", "BPVN-QEP-001", "BPVN-DCC-SMP-001".',
  })
  @IsOptional()
  @IsString()
  documentNo?: string | null;

  @ApiPropertyOptional({
    description:
      "Revision label: A/0 (original), A/1..A/10, then B/0..B/10, etc.",
    example: "A/0",
  })
  @IsOptional()
  @IsString()
  revisionLabel?: string | null;
}
