import { ApiProperty } from "@nestjs/swagger";
import { MetricType } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsJSON,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

export class CreateKpiMetricDto {
  @ApiProperty({ description: "KPI record ID", format: "uuid" })
  @IsUUID()
  kpiRecordId: string;

  @ApiProperty({ example: "理论转机数量 (台) Số máy cần chuyển (máy)" })
  @IsString()
  name: string;

  @ApiProperty({ enum: MetricType, example: MetricType.TARGET })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiProperty({
    description: "Monthly values JSON: { m1: 0, m2: 0, ..., avg: 0 }",
    type: String,
    required: false,
  })
  @IsJSON()
  @IsOptional()
  values?: string;
}
