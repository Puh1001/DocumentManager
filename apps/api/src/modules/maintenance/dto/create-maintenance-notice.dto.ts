import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
} from "class-validator";

export class CreateMaintenanceNoticeDto {
  @ApiProperty({ example: "Line A scheduled check" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: "Inspect conveyor belts and recalibrate sensors.",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: "2025-01-05T00:00:00Z" })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: "2025-01-05T23:59:59Z" })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ example: "uuid-of-department" })
  @IsString()
  @IsOptional()
  departmentId?: string;
}
