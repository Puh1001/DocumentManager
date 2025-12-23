import { Controller, Get, Param, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { KpiExportService } from "../services/kpi-export.service";

@ApiTags("KPI Export")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("kpi/records")
export class KpiExportController {
  constructor(private readonly kpiExportService: KpiExportService) {}

  @Get(":id/export")
  @ApiOperation({ summary: "Export KPI record to Excel" })
  async export(@Param("id") id: string, @Res() res: Response) {
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
