import { Module } from "@nestjs/common";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { AuthorizationModule } from "@/modules/authorization/authorization.module";
import { StorageModule } from "@/modules/storage/storage.module";
import { MaintenanceController } from "./controllers/maintenance.controller";
import { MaintenanceService } from "./services/maintenance.service";
import { MaintenanceAttachmentController } from "./controllers/maintenance-attachment.controller";
import { MaintenanceAttachmentService } from "./services/maintenance-attachment.service";

@Module({
  imports: [PrismaModule, AuthorizationModule, StorageModule],
  controllers: [MaintenanceController, MaintenanceAttachmentController],
  providers: [MaintenanceService, MaintenanceAttachmentService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}

