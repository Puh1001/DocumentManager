import { IsString, IsOptional, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: "editor" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: "Can edit documents" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
