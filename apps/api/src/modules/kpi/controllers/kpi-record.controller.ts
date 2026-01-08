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
import { UserDepartmentGuard } from "../guards/user-department.guard";
import { CurrentUserWithDepartment } from "../decorators/current-user-with-department.decorator";
import { UserWithDepartments } from "../services/user-department.resolver";

@ApiTags("KPI Records")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserDepartmentGuard)
@Controller("kpi/records")
export class KpiRecordController {
  constructor(private readonly kpiRecordService: KpiRecordService) {}

  @Get()
  @ApiOperation({ summary: "List KPI records" })
  @ApiQuery({ name: "departmentId", required: false })
  @ApiQuery({ name: "year", required: false, type: Number })
  async findAll(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Query("departmentId") departmentId?: string,
    @Query("year") year?: string
  ) {
    return this.kpiRecordService.findAll(
      {
        departmentId: departmentId || undefined,
        year: year ? Number(year) : undefined,
      },
      user
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get KPI record by ID" })
  async findOne(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Param("id") id: string
  ) {
    return this.kpiRecordService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: "Create KPI record" })
  async create(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Body() dto: CreateKpiRecordDto
  ) {
    return this.kpiRecordService.create(dto, user);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update KPI record" })
  async update(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Param("id") id: string,
    @Body() dto: UpdateKpiRecordDto
  ) {
    return this.kpiRecordService.update(id, dto, user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete KPI record" })
  async remove(
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Param("id") id: string
  ) {
    return this.kpiRecordService.remove(id, user);
  }
}
