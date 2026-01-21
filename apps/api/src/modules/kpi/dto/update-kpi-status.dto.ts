import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { KpiStatus } from "@prisma/client";

export class UpdateKpiStatusDto {
  @ApiProperty({
    enum: KpiStatus,
    example: KpiStatus.COMPLETED,
    description: "KPI record status",
  })
  @IsEnum(KpiStatus)
  status: KpiStatus;
}
