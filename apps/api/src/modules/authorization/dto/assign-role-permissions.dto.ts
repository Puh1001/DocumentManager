import { IsArray, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AssignRolePermissionsDto {
  @ApiProperty({
    description: "Array of permission IDs to assign to the role",
    example: ["uuid-1", "uuid-2"],
    type: [String],
  })
  @IsArray()
  @IsUUID("4", { each: true })
  permissionIds: string[];
}
