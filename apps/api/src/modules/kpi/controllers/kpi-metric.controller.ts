import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { KpiMetricService } from "../services/kpi-metric.service";
import { CreateKpiMetricDto } from "../dto/create-kpi-metric.dto";
import { UpdateKpiMetricDto } from "../dto/update-kpi-metric.dto";

@ApiTags("KPI Metrics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("kpi/metrics")
export class KpiMetricController {
  constructor(private readonly kpiMetricService: KpiMetricService) {}

  @Post()
  @ApiOperation({ summary: "Create KPI metric row" })
  create(@Body() dto: CreateKpiMetricDto) {
    return this.kpiMetricService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update KPI metric row" })
  update(@Param("id") id: string, @Body() dto: UpdateKpiMetricDto) {
    return this.kpiMetricService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete KPI metric row" })
  remove(@Param("id") id: string) {
    return this.kpiMetricService.remove(id);
  }
}
