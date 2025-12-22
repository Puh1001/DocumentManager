import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as chokidar from "chokidar";
import * as path from "path";

@Injectable()
export class FolderWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FolderWatcherService.name);
  private watcher: chokidar.FSWatcher | null = null;
  private basePath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    // Get base path from SMB service config
    if (process.platform === "win32") {
      const useMountedDrive = this.configService.get<boolean>(
        "SMB_USE_MOUNTED_DRIVE",
        false
      );
      if (useMountedDrive) {
        const drive = this.configService.get<string>("SMB_MOUNTED_DRIVE", "Z:");
        const share = this.configService.get<string>("SMB_SHARE", "Public");
        const basePath = this.configService.get<string>("SMB_BASE_PATH", "");
        this.basePath = basePath
          ? path.join(drive, share, basePath.replace(/\\/g, path.sep))
          : path.join(drive, share);
      } else {
        const server = this.configService.get<string>(
          "SMB_SERVER",
          "10.0.60.30"
        );
        const share = this.configService.get<string>("SMB_SHARE", "Public");
        const basePath = this.configService.get<string>(
          "SMB_BASE_PATH",
          "IT-Information Technology Dept\\devTest"
        );
        this.basePath = `\\\\${server}\\${share}\\${basePath}`;
      }
    } else {
      this.basePath = this.configService.get<string>(
        "SMB_MOUNT_PATH",
        "/shared"
      );
    }
  }

  async onModuleInit() {
    // Start watching after a short delay to ensure SMB is mounted
    setTimeout(() => {
      this.startWatching();
    }, 2000);
  }

  async onModuleDestroy() {
    await this.stopWatching();
  }

  private startWatching() {
    try {
      this.logger.log(`Starting file watcher for: ${this.basePath}`);

      this.watcher = chokidar.watch(this.basePath, {
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: true, // Don't emit events for existing files
        awaitWriteFinish: {
          stabilityThreshold: 2000, // Wait 2s after file stops changing
          pollInterval: 100,
        },
      });

      // Watch for file additions
      this.watcher.on("add", (filePath) => {
        this.logger.debug(`File added: ${filePath}`);
        this.eventEmitter.emit("file.added", {
          path: filePath,
          relativePath: path.relative(this.basePath, filePath),
        });
      });

      // Watch for file changes
      this.watcher.on("change", (filePath) => {
        this.logger.debug(`File changed: ${filePath}`);
        this.eventEmitter.emit("file.changed", {
          path: filePath,
          relativePath: path.relative(this.basePath, filePath),
        });
      });

      // Watch for file deletions
      this.watcher.on("unlink", (filePath) => {
        this.logger.debug(`File deleted: ${filePath}`);
        this.eventEmitter.emit("file.deleted", {
          path: filePath,
          relativePath: path.relative(this.basePath, filePath),
        });
      });

      // Watch for folder additions
      this.watcher.on("addDir", (dirPath) => {
        this.logger.debug(`Folder added: ${dirPath}`);
        this.eventEmitter.emit("folder.added", {
          path: dirPath,
          relativePath: path.relative(this.basePath, dirPath),
        });
      });

      // Watch for folder deletions
      this.watcher.on("unlinkDir", (dirPath) => {
        this.logger.debug(`Folder deleted: ${dirPath}`);
        this.eventEmitter.emit("folder.deleted", {
          path: dirPath,
          relativePath: path.relative(this.basePath, dirPath),
        });
      });

      // Error handling
      this.watcher.on("error", (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`File watcher error: ${errorMessage}`);
        // Attempt to restart watcher after delay
        setTimeout(() => {
          this.stopWatching();
          this.startWatching();
        }, 5000);
      });

      this.logger.log("File watcher started successfully");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to start file watcher: ${errorMessage}`);
    }
  }

  private async stopWatching() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.logger.log("File watcher stopped");
    }
  }
}
