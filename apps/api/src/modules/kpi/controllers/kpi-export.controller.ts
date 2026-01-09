import { Controller, Get, Param, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { UserDepartmentGuard } from "../guards/user-department.guard";
import { CurrentUserWithDepartment } from "../decorators/current-user-with-department.decorator";
import { UserWithDepartments } from "../services/user-department.resolver";
import { KpiExportService } from "../services/kpi-export.service";
import { KpiRecordService } from "../services/kpi-record.service";

@ApiTags("KPI Export")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserDepartmentGuard)
@Controller("kpi/records")
export class KpiExportController {
  constructor(
    private readonly kpiExportService: KpiExportService,
    private readonly kpiRecordService: KpiRecordService
  ) {}

  @Get(":id/export")
  @ApiOperation({ summary: "Export KPI record to Excel" })
  async export(
    @Param("id") id: string,
    @CurrentUserWithDepartment() user: UserWithDepartments,
    @Res() res: Response
  ) {
    // Check access permission (read-only access is allowed for kpi_viewer_all)
    await this.kpiRecordService.findOne(id, user);

    const buffer = await this.kpiExportService.exportRecord(id);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="kpi_${id}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  }
}
