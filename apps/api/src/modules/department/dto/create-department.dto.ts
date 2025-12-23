import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateDepartmentDto {
  @ApiProperty({ example: "转机部 chuyển máy dệt dây đai-V-TECH" })
  @IsString()
  name: string;

  @ApiProperty({ example: "V-TECH" })
  @IsString()
  code: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
