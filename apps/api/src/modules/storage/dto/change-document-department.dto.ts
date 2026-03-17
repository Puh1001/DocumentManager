import { IsUUID, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangeDocumentDepartmentDto {
  @ApiProperty({
    description:
      "Target department ID. Document will be moved to that department's ISO_documents folder.",
  })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;
}
