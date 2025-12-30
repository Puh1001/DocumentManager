import {
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  IsBoolean,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateModuleDto {
  @ApiPropertyOptional({
    example: "User",
    description: "Module name (PascalCase, alphanumeric only)",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^[A-Z][a-zA-Z0-9]*$/, {
    message:
      "Module name must be PascalCase (start with uppercase, alphanumeric only)",
  })
  name?: string;

  @ApiPropertyOptional({
    example: "User Management",
    description: "Display name for the module",
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ example: "User management module" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Whether the module is active",
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
