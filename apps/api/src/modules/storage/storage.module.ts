import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SmbService } from "./services/smb.service";
import { FolderService } from "./services/folder.service";
import { FolderSyncService } from "./services/folder-sync.service";
import { DocumentService } from "./services/document.service";
import { DocumentDeletionService } from "./services/document-deletion.service";
import { VersionService } from "./services/version.service";
import { LocalEditService } from "./services/local-edit.service";
import { StatsService } from "./services/stats.service";
import { DocumentSyncHandler } from "./handlers/document-sync.handler";
import { FolderSyncHandler } from "./handlers/folder-sync.handler";
import { SyncDeletionHandler } from "./handlers/sync-deletion.handler";
import { FolderSyncGateway } from "./gateways/folder-sync.gateway";
import { SyncEventListenerService } from "./services/sync-event-listener.service";
import { FolderWatcherService } from "./services/folder-watcher.service";
import { FolderSyncListener } from "./listeners/folder-sync.listener";
import { FolderController } from "./controllers/folder.controller";
import { DocumentController } from "./controllers/document.controller";
import { DocumentLevelController } from "./controllers/document-level.controller";
import { DeletionRequestController } from "./controllers/deletion-request.controller";
import { StatsController } from "./controllers/stats.controller";
import { DocumentLevelService } from "./services/document-level.service";
import { UsersModule } from "@/modules/users/users.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { AuthorizationModule } from "@/modules/authorization/authorization.module";

@Module({
  imports: [ConfigModule, UsersModule, AuthModule, AuthorizationModule],
  controllers: [
    FolderController,
    DocumentController,
    DocumentLevelController,
    DeletionRequestController,
    StatsController,
  ],
  providers: [
    SmbService,
    FolderService,
    DocumentLevelService,
    FolderSyncService,
    DocumentService,
    DocumentDeletionService,
    VersionService,
    LocalEditService,
    StatsService,
    DocumentSyncHandler,
    FolderSyncHandler,
    SyncDeletionHandler,
    FolderSyncGateway,
    SyncEventListenerService,
    FolderWatcherService,
    FolderSyncListener,
  ],
  exports: [
    SmbService,
    FolderService,
    DocumentService,
    DocumentLevelService,
    DocumentDeletionService,
    VersionService,
    LocalEditService,
    StatsService,
  ],
})
export class StorageModule {}
