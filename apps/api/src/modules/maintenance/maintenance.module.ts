import { Module } from "@nestjs/common";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { AuthorizationModule } from "@/modules/authorization/authorization.module";
import { MaintenanceController } from "./controllers/maintenance.controller";
import { MaintenanceService } from "./services/maintenance.service";

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}

