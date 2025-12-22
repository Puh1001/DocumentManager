import {
  IsArray,
  IsEnum,
  IsUUID,
  IsBoolean,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { SubjectType } from "@prisma/client";

class FolderPermissionItemDto {
  @ApiProperty({
    description: "Type of subject (USER or ROLE)",
    enum: SubjectType,
    example: SubjectType.USER,
  })
  @IsEnum(SubjectType)
  subjectType: SubjectType;

  @ApiProperty({
    description: "ID of the user or role",
    example: "uuid-1",
  })
  @IsUUID("4")
  subjectId: string;

  @ApiProperty({
    description: "Permission ID",
    example: "uuid-2",
  })
  @IsUUID("4")
  permissionId: string;

  @ApiProperty({
    description: "Whether to inherit permissions to subfolders and documents",
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  inherit?: boolean;
}

export class SetFolderPermissionsDto {
  @ApiProperty({
    description: "Array of folder permissions",
    type: [FolderPermissionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FolderPermissionItemDto)
  permissions: FolderPermissionItemDto[];
}
