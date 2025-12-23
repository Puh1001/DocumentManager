import { Module } from "@nestjs/common";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { AuthorizationModule } from "@/modules/authorization/authorization.module";
import { DepartmentController } from "./controllers/department.controller";
import { DepartmentService } from "./services/department.service";

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
