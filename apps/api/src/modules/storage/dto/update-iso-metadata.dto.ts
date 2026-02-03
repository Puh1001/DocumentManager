import { IsOptional, IsUUID, IsDateString, ValidateIf } from "class-validator";
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
}
