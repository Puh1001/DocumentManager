import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateModuleDto {
  @ApiProperty({
    example: "User",
    description: "Module name (PascalCase, alphanumeric only)",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z][a-zA-Z0-9]*$/, {
    message:
      "Module name must be PascalCase (start with uppercase, alphanumeric only)",
  })
  name: string;

  @ApiProperty({
    example: "User Management",
    description: "Display name for the module",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  displayName: string;

  @ApiPropertyOptional({ example: "User management module" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
