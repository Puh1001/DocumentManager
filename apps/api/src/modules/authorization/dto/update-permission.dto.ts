import { IsString, IsOptional, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdatePermissionDto {
  @ApiPropertyOptional({ example: "view:User" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: "View user management page" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
