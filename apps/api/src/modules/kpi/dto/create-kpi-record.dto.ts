import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export enum DisplayType {
  PERCENTAGE = "PERCENTAGE",
  COUNT = "COUNT",
}

export enum RowMode {
  SINGLE = "SINGLE", // 1 dòng: ACTUAL only
  DOUBLE = "DOUBLE", // 2 dòng: TARGET + ACTUAL
}

export class CreateKpiRecordDto {
  @ApiProperty({ description: "Department ID", format: "uuid" })
  @IsUUID()
  departmentId: string;

  @ApiProperty({ example: 2025 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: "梭织转机效率 Hiệu quả chuyển máy dệt thoi" })
  @IsString()
  title: string;

  @ApiProperty({ example: "≥85%" })
  @IsString()
  target: string;

  @ApiProperty({ example: 85, required: false })
  @IsOptional()
  targetValue?: number;

  @ApiProperty({
    enum: DisplayType,
    example: DisplayType.PERCENTAGE,
    required: false,
  })
  @IsEnum(DisplayType)
  @IsOptional()
  displayType?: DisplayType;

  @ApiProperty({
    enum: RowMode,
    example: RowMode.DOUBLE,
    required: false,
    description: "Row mode for COUNT tables: SINGLE (1 row) or DOUBLE (2 rows)",
  })
  @IsEnum(RowMode)
  @IsOptional()
  rowMode?: RowMode;
}
