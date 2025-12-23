import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: "转机部 chuyển máy dệt dây đai-V-TECH" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: "V-TECH" })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
