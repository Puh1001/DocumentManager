import { IsArray, IsEnum, IsUUID, ValidateNested } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { SubjectType } from "@prisma/client";

class DocumentPermissionItemDto {
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
}

export class SetDocumentPermissionsDto {
  @ApiProperty({
    description: "Array of document permissions",
    type: [DocumentPermissionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentPermissionItemDto)
  permissions: DocumentPermissionItemDto[];
}
