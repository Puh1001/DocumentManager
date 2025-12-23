import { PartialType } from "@nestjs/swagger";
import { CreateKpiMetricDto } from "./create-kpi-metric.dto";

export class UpdateKpiMetricDto extends PartialType(CreateKpiMetricDto) {}
