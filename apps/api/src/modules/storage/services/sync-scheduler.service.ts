import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { FolderSyncService } from "./folder-sync.service";

@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);
  private isRunning = false;

  constructor(
    private readonly syncService: FolderSyncService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Scheduled sync - runs based on cron expression from env
   * Default: Every hour (0 * * * *)
   */
  @Cron(process.env.SYNC_CRON || CronExpression.EVERY_HOUR, {
    name: "scheduled-sync",
  })
  async handleScheduledSync() {
    if (this.isRunning) {
      this.logger.warn("Sync already running, skipping scheduled sync");
      return;
    }

    this.isRunning = true;
    this.logger.log("Starting scheduled file system sync");

    try {
      await this.syncService.syncWithFileSystem();
      this.logger.log("Scheduled sync completed successfully");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Scheduled sync failed: ${errorMessage}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manual sync trigger (can be called from API)
   */
  async triggerSync(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Sync is already running");
    }

    this.isRunning = true;
    try {
      await this.syncService.syncWithFileSystem();
    } finally {
      this.isRunning = false;
    }
  }
}
