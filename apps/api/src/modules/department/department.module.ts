import { Module } from "@nestjs/common";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { AuthorizationModule } from "@/modules/authorization/authorization.module";
import { StorageModule } from "@/modules/storage/storage.module";
import { DepartmentController } from "./controllers/department.controller";
import { DepartmentService } from "./services/department.service";

@Module({
  imports: [PrismaModule, AuthorizationModule, StorageModule],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
