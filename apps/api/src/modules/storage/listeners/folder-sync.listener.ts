import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { FolderSyncGateway } from "../gateways/folder-sync.gateway";
import { FolderSyncService } from "../services/folder-sync.service";

@Injectable()
export class FolderSyncListener {
  private readonly logger = new Logger(FolderSyncListener.name);

  constructor(
    private readonly gateway: FolderSyncGateway,
    private readonly syncService: FolderSyncService
  ) {}

  @OnEvent("file.added")
  async handleFileAdded(event: { path: string; relativePath: string }) {
    this.logger.debug(`File added event: ${event.relativePath}`);

    try {
      // Sync file to database first
      const result = await this.syncService.syncSingleFile(event.relativePath);

      if (result && result.folderId) {
        // Broadcast event with folderId so frontend knows which folder to refresh
        this.gateway.broadcastSyncEvent({
          type: "document_added",
          folderId: result.folderId,
          documentId: result.documentId,
          data: { path: event.relativePath },
        });
      } else {
        // Fallback: broadcast without folderId (will refresh all folders)
        this.gateway.broadcastSyncEvent({
          type: "document_added",
          data: { path: event.relativePath },
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to handle file added event: ${errorMessage}`);
      // Still broadcast event even if sync failed
      this.gateway.broadcastSyncEvent({
        type: "document_added",
        data: { path: event.relativePath },
      });
    }
  }

  @OnEvent("file.changed")
  async handleFileChanged(event: { path: string; relativePath: string }) {
    this.logger.debug(`File changed event: ${event.relativePath}`);

    try {
      // Sync file to database (will create new version if changed)
      const result = await this.syncService.syncSingleFile(event.relativePath);

      if (result && result.folderId) {
        this.gateway.broadcastSyncEvent({
          type: "document_updated",
          folderId: result.folderId,
          documentId: result.documentId,
          data: { path: event.relativePath },
        });
      } else {
        this.gateway.broadcastSyncEvent({
          type: "document_updated",
          data: { path: event.relativePath },
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to handle file changed event: ${errorMessage}`);
      this.gateway.broadcastSyncEvent({
        type: "document_updated",
        data: { path: event.relativePath },
      });
    }
  }

  @OnEvent("file.deleted")
  async handleFileDeleted(event: { path: string; relativePath: string }) {
    this.logger.debug(`File deleted event: ${event.relativePath}`);

    try {
      // Soft delete file in database first
      const result = await this.syncService.deleteSingleFile(
        event.relativePath
      );

      if (result && result.folderId) {
        // Broadcast event with folderId so frontend knows which folder to refresh
        this.logger.debug(
          `Broadcasting document_deleted with folderId: ${result.folderId}, documentId: ${result.documentId}`
        );
        this.gateway.broadcastSyncEvent({
          type: "document_deleted",
          folderId: result.folderId,
          documentId: result.documentId,
          data: { path: event.relativePath },
        });
      } else {
        // Fallback: broadcast without folderId (will refresh all folders)
        this.logger.warn(
          `Broadcasting document_deleted without folderId for: ${event.relativePath}`
        );
        this.gateway.broadcastSyncEvent({
          type: "document_deleted",
          data: { path: event.relativePath },
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to handle file deleted event: ${errorMessage}`);
      // Still broadcast event even if delete failed
      this.gateway.broadcastSyncEvent({
        type: "document_deleted",
        data: { path: event.relativePath },
      });
    }
  }

  @OnEvent("folder.added")
  async handleFolderAdded(event: { path: string; relativePath: string }) {
    this.logger.debug(`Folder added event: ${event.relativePath}`);

    this.gateway.broadcastSyncEvent({
      type: "folder_added",
      data: { path: event.relativePath },
    });
  }

  @OnEvent("folder.deleted")
  async handleFolderDeleted(event: { path: string; relativePath: string }) {
    this.logger.debug(`Folder deleted event: ${event.relativePath}`);

    this.gateway.broadcastSyncEvent({
      type: "folder_deleted",
      data: { path: event.relativePath },
    });
  }
}
