import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { ConfigService } from "@nestjs/config";
import { FolderSyncService } from "./folder-sync.service";
import { FolderSyncGateway } from "../gateways/folder-sync.gateway";

interface FileEvent {
  relativePath: string;
  type: "add" | "change" | "unlink";
}

interface FolderEvent {
  relativePath: string;
  type: "addDir" | "unlinkDir";
}

@Injectable()
export class SyncEventListenerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SyncEventListenerService.name);
  private eventBuffer = new Map<string, FileEvent | FolderEvent>();
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS: number;
  private readonly MAX_BUFFER_SIZE: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly folderSyncService: FolderSyncService,
    private readonly folderSyncGateway: FolderSyncGateway
  ) {
    // Make batch window configurable (default: 200ms)
    this.BATCH_WINDOW_MS = this.configService.get<number>(
      "SYNC_BATCH_WINDOW_MS",
      200
    );

    // Make max buffer size configurable (default: 1000 events)
    this.MAX_BUFFER_SIZE = this.configService.get<number>(
      "SYNC_MAX_BUFFER_SIZE",
      1000
    );
  }

  onModuleInit() {
    this.logger.log(
      `Initializing sync event listeners (batch window: ${this.BATCH_WINDOW_MS}ms, max buffer: ${this.MAX_BUFFER_SIZE})`
    );
  }

  async onModuleDestroy() {
    this.logger.log("Shutting down sync event listeners...");

    // Clear pending timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining events before shutdown
    if (this.eventBuffer.size > 0) {
      this.logger.log(
        `Flushing ${this.eventBuffer.size} remaining events before shutdown`
      );
      try {
        await this.flushBufferedEvents();
        this.logger.log("Successfully flushed remaining events");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          `Error flushing events on shutdown: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined
        );
      }
    }

    this.logger.log("Sync event listeners destroyed");
  }

  @OnEvent("file.added", { async: true })
  async handleFileAdded(payload: { relativePath: string }) {
    this.bufferEvent(payload.relativePath, {
      relativePath: payload.relativePath,
      type: "add",
    });
  }

  @OnEvent("file.changed", { async: true })
  async handleFileChanged(payload: { relativePath: string }) {
    this.bufferEvent(payload.relativePath, {
      relativePath: payload.relativePath,
      type: "change",
    });
  }

  @OnEvent("file.deleted", { async: true })
  async handleFileDeleted(payload: { relativePath: string }) {
    this.bufferEvent(payload.relativePath, {
      relativePath: payload.relativePath,
      type: "unlink",
    });
  }

  // NOTE: Folder events are handled by FolderSyncListener for real-time sync
  // This service only handles file events to avoid double processing
  // @OnEvent("folder.added") - REMOVED: Handled by FolderSyncListener
  // @OnEvent("folder.deleted") - REMOVED: Handled by FolderSyncListener

  private bufferEvent(
    relativePath: string,
    event: FileEvent | FolderEvent
  ) {
    // Check buffer size for backpressure
    if (this.eventBuffer.size >= this.MAX_BUFFER_SIZE) {
      // Priority: deletions > changes > additions
      const isCritical = event.type === 'unlink' || event.type === 'unlinkDir';
      
      if (isCritical) {
        // Force flush and add critical event
        this.logger.warn(
          `Event buffer full (${this.eventBuffer.size}/${this.MAX_BUFFER_SIZE}), forcing flush for critical event: ${relativePath}`
        );
        // Clear timer and flush immediately for critical events
        if (this.flushTimer) {
          clearTimeout(this.flushTimer);
          this.flushTimer = null;
        }
        // Flush asynchronously to avoid blocking
        this.flushBufferedEvents().catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          this.logger.error(
            `Error flushing buffer for critical event: ${errorMessage}`
          );
        });
      } else {
        // Drop non-critical events when buffer full
        this.logger.warn(
          `Event buffer full (${this.eventBuffer.size}/${this.MAX_BUFFER_SIZE}), dropping non-critical event: ${relativePath}`
        );
        return;
      }
    }
    
    // Overwrite duplicate events for same path (deduplication)
    this.eventBuffer.set(relativePath, event);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      this.flushBufferedEvents();
    }, this.BATCH_WINDOW_MS);
  }

  private async flushBufferedEvents() {
    const events = Array.from(this.eventBuffer.values());
    const bufferSize = events.length;
    this.eventBuffer.clear();

    if (bufferSize === 0) {
      return;
    }

    // Monitor buffer size for performance issues
    if (bufferSize > 50) {
      this.logger.warn(
        `Large event buffer flushed: ${bufferSize} events (possible high load)`
      );
    }

    // Sort events by priority: deletions first, then changes, then additions
    const priorityOrder = { unlink: 0, unlinkDir: 0, change: 1, add: 2, addDir: 2 };
    events.sort((a, b) => {
      const priorityA = priorityOrder[a.type as keyof typeof priorityOrder] ?? 3;
      const priorityB = priorityOrder[b.type as keyof typeof priorityOrder] ?? 3;
      return priorityA - priorityB;
    });

    // Process events with limited concurrency to avoid overwhelming database
    const CONCURRENT_LIMIT = 5;
    for (let i = 0; i < events.length; i += CONCURRENT_LIMIT) {
      const batch = events.slice(i, i + CONCURRENT_LIMIT);
      await Promise.all(
        batch.map(async (event) => {
          try {
            await this.processEvent(event);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            this.logger.error(
              `Error processing event for ${event.relativePath}: ${errorMessage}`,
              error instanceof Error ? error.stack : undefined
            );
          }
        })
      );
    }
  }

  private async processEvent(event: FileEvent | FolderEvent) {
    const isFileEvent = ["add", "change", "unlink"].includes(event.type);

    if (isFileEvent) {
      await this.processFileEvent(event as FileEvent);
    } else {
      // Skip folder events - they're handled by FolderSyncListener
      // This prevents double processing
    }
  }

  private async processFileEvent(event: FileEvent) {
    switch (event.type) {
      case "add":
      case "change":
        await this.syncFile(event.relativePath);
        break;
      case "unlink":
        await this.deleteFile(event.relativePath);
        break;
    }
  }

  // private async processFolderEvent(event: FolderEvent) {
  //   // NOTE: Folder events are now handled by FolderSyncListener for real-time sync
  //   // This method is kept for compatibility but should not be called
  //   // (folder events are removed from buffer in processEvent)
  //   // No-op: FolderSyncListener handles folder sync/deletion
  // }

  private async syncFile(relativePath: string) {
    // Defensive check: validate path
    if (!relativePath || relativePath.trim() === "") {
      this.logger.warn("Skipping sync for empty path");
      return;
    }

    try {
      const result = await this.folderSyncService.syncSingleFile(relativePath);

      // Defensive check: ensure result has required properties
      if (result && result.folderId) {
        // Determine if new or updated based on whether documentId was returned
        const eventType = result.documentId
          ? "document_updated"
          : "document_added";

        // Broadcast to clients
        this.folderSyncGateway.broadcastSyncEvent({
          type: eventType,
          documentId: result.documentId,
          folderId: result.folderId,
          data: { path: relativePath },
        });

        this.logger.log(
          `File synced: ${relativePath} (${eventType}, folderId: ${result.folderId})`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to sync file ${relativePath}: ${errorMessage}`);
    }
  }

  private async deleteFile(relativePath: string) {
    // Defensive check: validate path
    if (!relativePath || relativePath.trim() === "") {
      this.logger.warn("Skipping delete for empty path");
      return;
    }

    try {
      const result =
        await this.folderSyncService.deleteSingleFile(relativePath);

      // Defensive check: ensure result has required properties
      if (result && result.folderId) {
        this.folderSyncGateway.broadcastSyncEvent({
          type: "document_deleted",
          documentId: result.documentId,
          folderId: result.folderId,
          data: { path: relativePath },
        });

        this.logger.log(
          `File deleted: ${relativePath} (folderId: ${result.folderId})`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to delete file ${relativePath}: ${errorMessage}`
      );
    }
  }

  private async syncFolder(relativePath: string) {
    // Defensive check: validate path
    if (!relativePath || relativePath.trim() === "") {
      this.logger.warn("Skipping sync for empty folder path");
      return;
    }

    try {
      // For now, folder events are logged but not actively synced
      // Full sync will pick up new folders on next scheduled sync
      // TODO: Implement selective folder sync if needed
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to sync folder ${relativePath}: ${errorMessage}`
      );
    }
  }

  private async deleteFolder(relativePath: string) {
    // Defensive check: validate path
    if (!relativePath || relativePath.trim() === "") {
      this.logger.warn("Skipping delete for empty folder path");
      return;
    }

    try {
      // Folder deletions are handled by the two-pass sync algorithm
      // which will detect missing folders and soft-delete them
      // TODO: Implement immediate folder soft-delete if needed
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to delete folder ${relativePath}: ${errorMessage}`
      );
    }
  }
}
