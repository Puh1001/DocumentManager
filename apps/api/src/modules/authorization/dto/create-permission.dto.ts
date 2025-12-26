import { IsString, IsNotEmpty, IsOptional, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePermissionDto {
  @ApiProperty({ example: "view:User" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: "View user management page" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
