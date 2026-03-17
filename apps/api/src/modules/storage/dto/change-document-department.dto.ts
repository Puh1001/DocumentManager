import { IsUUID, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangeDocumentDepartmentDto {
  @ApiProperty({
    description: "Target folder ID (must be under ISO_documents in the desired department)",
  })
  @IsUUID()
  @IsNotEmpty()
  folderId: string;
}
