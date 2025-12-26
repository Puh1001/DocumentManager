import { Module } from "@nestjs/common";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { CaslAbilityFactory } from "./factories/casl-ability.factory";
import { PoliciesGuard } from "./guards/policies.guard";
import { PermissionService } from "./services/permission.service";
import { RoleService } from "./services/role.service";
import { PermissionController } from "./controllers/permission.controller";
import { RoleController } from "./controllers/role.controller";

@Module({
  imports: [PrismaModule],
  providers: [
    CaslAbilityFactory,
    PoliciesGuard,
    PermissionService,
    RoleService,
  ],
  controllers: [PermissionController, RoleController],
  exports: [CaslAbilityFactory, PoliciesGuard, PermissionService, RoleService],
})
export class AuthorizationModule {}
