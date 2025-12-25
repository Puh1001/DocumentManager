import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SmbService } from "./services/smb.service";
import { FolderService } from "./services/folder.service";
import { FolderSyncService } from "./services/folder-sync.service";
import { DocumentService } from "./services/document.service";
import { VersionService } from "./services/version.service";
import { LocalEditService } from "./services/local-edit.service";
import { StatsService } from "./services/stats.service";
import { DocumentSyncHandler } from "./handlers/document-sync.handler";
import { FolderSyncHandler } from "./handlers/folder-sync.handler";
import { SyncDeletionHandler } from "./handlers/sync-deletion.handler";
import { FolderSyncGateway } from "./gateways/folder-sync.gateway";
import { FolderSyncListener } from "./listeners/folder-sync.listener";
import { FolderController } from "./controllers/folder.controller";
import { DocumentController } from "./controllers/document.controller";
import { StatsController } from "./controllers/stats.controller";
import { UsersModule } from "@/modules/users/users.module";
import { AuthModule } from "@/modules/auth/auth.module";

@Module({
  imports: [ConfigModule, UsersModule, AuthModule],
  controllers: [FolderController, DocumentController, StatsController],
  providers: [
    SmbService,
    FolderService,
    FolderSyncService,
    DocumentService,
    VersionService,
    LocalEditService,
    StatsService,
    DocumentSyncHandler,
    FolderSyncHandler,
    SyncDeletionHandler,
    FolderSyncGateway,
    FolderSyncListener,
  ],
  exports: [
    SmbService,
    FolderService,
    DocumentService,
    VersionService,
    LocalEditService,
    StatsService,
  ],
})
export class StorageModule {}
