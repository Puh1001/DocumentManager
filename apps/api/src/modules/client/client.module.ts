import { Module } from "@nestjs/common";
import { ClientController } from "./client.controller";
import { ClientService } from "./client.service";
import { StorageModule } from "@/modules/storage/storage.module";
import { AuthorizationModule } from "@/modules/authorization/authorization.module";

@Module({
  imports: [StorageModule, AuthorizationModule],
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
