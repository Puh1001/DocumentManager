import { Module } from "@nestjs/common";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { DepartmentModule } from "@/modules/department/department.module";
import { StorageModule } from "@/modules/storage/storage.module";
import { AuthorizationModule } from "@/modules/authorization/authorization.module";
import { KpiRecordController } from "./controllers/kpi-record.controller";
import { KpiMetricController } from "./controllers/kpi-metric.controller";
import { KpiExportController } from "./controllers/kpi-export.controller";
import { KpiRecordService } from "./services/kpi-record.service";
import { KpiMetricService } from "./services/kpi-metric.service";
import { KpiExportService } from "./services/kpi-export.service";
import { UserDepartmentResolver } from "./services/user-department.resolver";
import { UserDepartmentGuard } from "./guards/user-department.guard";
import { KpiAttachmentService } from "./services/kpi-attachment.service";
import { KpiAttachmentController } from "./controllers/kpi-attachment.controller";

@Module({
  imports: [PrismaModule, DepartmentModule, StorageModule, AuthorizationModule],
  controllers: [
    KpiRecordController,
    KpiMetricController,
    KpiExportController,
    KpiAttachmentController,
  ],
  providers: [
    KpiRecordService,
    KpiMetricService,
    KpiExportService,
    UserDepartmentResolver,
    UserDepartmentGuard,
    KpiAttachmentService,
  ],
  exports: [UserDepartmentResolver],
})
export class KpiModule {}
