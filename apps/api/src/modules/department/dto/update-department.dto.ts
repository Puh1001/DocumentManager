import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: "BOD" })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: "BOD" })
  @IsString()
  @IsOptional()
  name?: string; // Vietnamese name (for backward compatibility)

  @ApiPropertyOptional({ example: "General Manager's Office" })
  @IsString()
  @IsOptional()
  nameEn?: string; // English name

  @ApiPropertyOptional({ example: "BOD" })
  @IsString()
  @IsOptional()
  nameVi?: string; // Vietnamese name

  @ApiPropertyOptional({ example: "总经办BOD" })
  @IsString()
  @IsOptional()
  nameZh?: string; // Chinese name

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
