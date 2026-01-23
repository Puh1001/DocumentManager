import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { FolderSyncGateway } from "../gateways/folder-sync.gateway";
import { FolderSyncService } from "../services/folder-sync.service";

@Injectable()
export class FolderSyncListener {
  private readonly logger = new Logger(FolderSyncListener.name);
  // Event deduplication: track recent events to avoid processing duplicates
  private readonly recentEvents = new Map<string, number>();
  private readonly DEDUPLICATION_WINDOW_MS = 100; // Ignore duplicates within 100ms

  constructor(
    private readonly gateway: FolderSyncGateway,
    private readonly syncService: FolderSyncService
  ) {}

  @OnEvent("file.added")
  async handleFileAdded(event: { path: string; relativePath: string }) {

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

    try {
      // Soft delete file in database first
      const result = await this.syncService.deleteSingleFile(
        event.relativePath
      );

      if (result && result.folderId) {
        // Broadcast event with folderId so frontend knows which folder to refresh
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
    // Normalize path separators (Windows uses backslashes, DB uses forward slashes)
    const normalizedPath = event.relativePath.replace(/\\/g, '/');
    
    // Event deduplication: skip if same event processed recently
    const eventKey = `folder.added:${normalizedPath}`;
    const now = Date.now();
    const lastProcessed = this.recentEvents.get(eventKey);
    
    if (lastProcessed && (now - lastProcessed) < this.DEDUPLICATION_WINDOW_MS) {
      return;
    }
    
    // Mark event as processed
    this.recentEvents.set(eventKey, now);
    
    // Clean up old entries (keep map size reasonable)
    if (this.recentEvents.size > 1000) {
      const cutoff = now - this.DEDUPLICATION_WINDOW_MS * 10;
      for (const [key, timestamp] of this.recentEvents.entries()) {
        if (timestamp < cutoff) {
          this.recentEvents.delete(key);
        }
      }
    }
    
    this.logger.log(`[REALTIME SYNC] Folder added event received: ${normalizedPath} (original: ${event.relativePath})`);

    try {
      // Sync folder to database first (recursively syncs parent folders if needed)
      const folderId = await this.syncService.syncSingleFolder(normalizedPath);

      if (folderId) {
        // Broadcast event with folderId so frontend knows which folder was added
        this.gateway.broadcastSyncEvent({
          type: "folder_added",
          folderId: folderId,
          data: { path: event.relativePath },
        });
      } else {
        // Fallback: broadcast without folderId (will trigger full refresh)
        this.logger.warn(`Failed to sync folder, broadcasting without folderId: ${normalizedPath}`);
        this.gateway.broadcastSyncEvent({
          type: "folder_added",
          data: { path: normalizedPath },
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to handle folder added event: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      // Still broadcast event even if sync failed
      this.gateway.broadcastSyncEvent({
        type: "folder_added",
        data: { path: normalizedPath },
      });
    }
  }

  @OnEvent("folder.deleted")
  async handleFolderDeleted(event: { path: string; relativePath: string }) {
    // Normalize path separators (Windows uses backslashes, DB uses forward slashes)
    const normalizedPath = event.relativePath.replace(/\\/g, '/');
    
    // Event deduplication: skip if same event processed recently
    const eventKey = `folder.deleted:${normalizedPath}`;
    const now = Date.now();
    const lastProcessed = this.recentEvents.get(eventKey);
    
    if (lastProcessed && (now - lastProcessed) < this.DEDUPLICATION_WINDOW_MS) {
      return;
    }
    
    // Mark event as processed
    this.recentEvents.set(eventKey, now);
    
    this.logger.log(`[REALTIME SYNC] Folder deleted event received: ${normalizedPath} (original: ${event.relativePath})`);

    try {
      // Soft delete folder in database first
      const result = await this.syncService.deleteSingleFolder(normalizedPath);

      if (result && result.folderId) {
        // Broadcast event with folderId so frontend knows which folder was deleted
        this.gateway.broadcastSyncEvent({
          type: "folder_deleted",
          folderId: result.folderId,
          data: { path: normalizedPath },
        });
      } else {
        // Fallback: broadcast without folderId (will refresh all folders)
        this.logger.warn(
          `Broadcasting folder_deleted without folderId for: ${normalizedPath}`
        );
        this.gateway.broadcastSyncEvent({
          type: "folder_deleted",
          data: { path: normalizedPath },
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to handle folder deleted event: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      // Still broadcast event even if delete failed
      this.gateway.broadcastSyncEvent({
        type: "folder_deleted",
        data: { path: normalizedPath },
      });
    }
  }
}
