import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { KpiRecordService } from "../services/kpi-record.service";
import { CreateKpiRecordDto } from "../dto/create-kpi-record.dto";
import { UpdateKpiRecordDto } from "../dto/update-kpi-record.dto";

@ApiTags("KPI Records")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("kpi/records")
export class KpiRecordController {
  constructor(private readonly kpiRecordService: KpiRecordService) {}

  @Get()
  @ApiOperation({ summary: "List KPI records" })
  @ApiQuery({ name: "departmentId", required: false })
  @ApiQuery({ name: "year", required: false, type: Number })
  findAll(
    @Query("departmentId") departmentId?: string,
    @Query("year") year?: string
  ) {
    return this.kpiRecordService.findAll({
      departmentId: departmentId || undefined,
      year: year ? Number(year) : undefined,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get KPI record by ID" })
  findOne(@Param("id") id: string) {
    return this.kpiRecordService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create KPI record" })
  create(@Body() dto: CreateKpiRecordDto) {
    return this.kpiRecordService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update KPI record" })
  update(@Param("id") id: string, @Body() dto: UpdateKpiRecordDto) {
    return this.kpiRecordService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete KPI record" })
  remove(@Param("id") id: string) {
    return this.kpiRecordService.remove(id);
  }
}
