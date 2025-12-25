import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsDateString,
} from "class-validator";

export class UpdateMaintenanceNoticeDto {
  @ApiPropertyOptional({ example: "Line A scheduled check" })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: "Inspect conveyor belts and recalibrate sensors." })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: "2025-01-05T00:00:00Z" })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: "2025-01-05T23:59:59Z" })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: "uuid-of-department" })
  @IsString()
  @IsOptional()
  departmentId?: string;
}

