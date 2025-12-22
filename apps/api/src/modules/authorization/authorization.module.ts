import { Module } from "@nestjs/common";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { CaslAbilityFactory } from "./factories/casl-ability.factory";
import { PoliciesGuard } from "./guards/policies.guard";
import { PermissionService } from "./services/permission.service";
import { PermissionController } from "./controllers/permission.controller";

@Module({
  imports: [PrismaModule],
  providers: [CaslAbilityFactory, PoliciesGuard, PermissionService],
  controllers: [PermissionController],
  exports: [CaslAbilityFactory, PoliciesGuard, PermissionService],
})
export class AuthorizationModule {}
