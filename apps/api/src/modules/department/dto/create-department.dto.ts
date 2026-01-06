import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateDepartmentDto {
  @ApiProperty({ example: "BOD" })
  @IsString()
  code: string;

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

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
