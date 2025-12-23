import { Module } from "@nestjs/common";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { DepartmentModule } from "@/modules/department/department.module";
import { KpiRecordController } from "./controllers/kpi-record.controller";
import { KpiMetricController } from "./controllers/kpi-metric.controller";
import { KpiExportController } from "./controllers/kpi-export.controller";
import { KpiRecordService } from "./services/kpi-record.service";
import { KpiMetricService } from "./services/kpi-metric.service";
import { KpiExportService } from "./services/kpi-export.service";

@Module({
  imports: [PrismaModule, DepartmentModule],
  controllers: [KpiRecordController, KpiMetricController, KpiExportController],
  providers: [KpiRecordService, KpiMetricService, KpiExportService],
})
export class KpiModule {}
