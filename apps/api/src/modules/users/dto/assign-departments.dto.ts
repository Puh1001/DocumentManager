import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from "class-validator";

export class AssignDepartmentsDto {
  @ApiProperty({
    description: "Array of department IDs to assign to the user",
    example: ["dept-id-1", "dept-id-2"],
    isArray: true,
    type: String,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: "At least one department ID is required" })
  @IsNotEmpty({ each: true })
  departmentIds: string[];
}
