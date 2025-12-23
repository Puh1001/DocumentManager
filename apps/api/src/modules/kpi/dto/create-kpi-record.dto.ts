import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

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
}
