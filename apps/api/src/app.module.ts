import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { StorageModule } from "./modules/storage/storage.module";
import { DepartmentModule } from "./modules/department/department.module";
import { HealthController } from "./health.controller";
import { KpiModule } from "./modules/kpi/kpi.module";
import { MaintenanceModule } from "./modules/maintenance/maintenance.module";
import { ClientModule } from "./modules/client/client.module";

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // Event emitter (required for @OnEvent decorator)
    EventEmitterModule.forRoot(),

    // Rate limiting - important for 10k+ users
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: "medium",
        ttl: 10000, // 10 seconds
        limit: 50, // 50 requests per 10 seconds
      },
      {
        name: "long",
        ttl: 60000, // 1 minute
        limit: 200, // 200 requests per minute
      },
    ]),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    StorageModule,
    DepartmentModule,
    KpiModule,
    MaintenanceModule,
    ClientModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
