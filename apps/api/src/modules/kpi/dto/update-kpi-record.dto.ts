import { PartialType } from "@nestjs/swagger";
import { CreateKpiRecordDto } from "./create-kpi-record.dto";

export class UpdateKpiRecordDto extends PartialType(CreateKpiRecordDto) {}
