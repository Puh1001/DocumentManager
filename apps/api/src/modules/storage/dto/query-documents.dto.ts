import { IsInt, IsOptional, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class QueryDocumentsDto {
  @ApiPropertyOptional({ description: "Page number (1-based)", default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    default: 20,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: ["ACTIVE", "ARCHIVED", "DELETED"],
    description: "Filter by document status",
  })
  @IsOptional()
  status?: "ACTIVE" | "ARCHIVED" | "DELETED";

  @ApiPropertyOptional({ description: "Filter by department ID" })
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    description:
      "Filter by document level ID (from GET /storage/document-levels)",
  })
  @IsOptional()
  level?: string;
}
