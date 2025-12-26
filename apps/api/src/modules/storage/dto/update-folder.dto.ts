import { IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateFolderDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Physical storage location" })
  @IsString()
  @IsOptional()
  physicalLocation?: string;

  @ApiPropertyOptional({
    description: "Department ID to link folder to department",
  })
  @IsString()
  @IsOptional()
  departmentId?: string | null;
}
