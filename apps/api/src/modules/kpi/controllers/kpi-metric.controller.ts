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
import { UserDepartmentGuard } from "../guards/user-department.guard";
import { CurrentUserWithDepartment } from "../decorators/current-user-with-department.decorator";
import { UserWithDepartments } from "../services/user-department.resolver";

@ApiTags("KPI Metrics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserDepartmentGuard)
@Controller("kpi/metrics")
export class KpiMetricController {
  constructor(private readonly kpiMetricService: KpiMetricService) {}

  @Post()
  @ApiOperation({ summary: "Create KPI metric row" })
  async create(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Body() dto: CreateKpiMetricDto
  ) {
    return this.kpiMetricService.create(dto, user);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update KPI metric row" })
  async update(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Param("id") id: string,
    @Body() dto: UpdateKpiMetricDto
  ) {
    return this.kpiMetricService.update(id, dto, user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete KPI metric row" })
  async remove(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Param("id") id: string
  ) {
    return this.kpiMetricService.remove(id, user);
  }
}
