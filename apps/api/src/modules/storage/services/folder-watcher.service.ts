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
  private restartTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
      // Production: Linux mounted path (from Docker volume)
      const mountPath = this.configService.get<string>(
        "SMB_MOUNT_PATH",
        "/shared"
      );
      const basePath = this.configService.get<string>("SMB_BASE_PATH", "");

      // Append basePath to mountPath if provided
      // This ensures we watch only the specified subfolder, not the entire share
      if (basePath) {
        // Normalize path separators for Linux (convert backslashes to forward slashes)
        const normalizedBasePath = basePath.replace(/\\/g, "/");
        this.basePath = path.join(mountPath, normalizedBasePath);
        this.logger.log(
          `Using mounted path with basePath: ${this.basePath} (mountPath: ${mountPath}, basePath: ${basePath})`
        );
      } else {
        this.basePath = mountPath;
        this.logger.warn(
          `SMB_BASE_PATH not set in production! Watching from root: ${this.basePath}. This may watch entire share instead of specific folder.`
        );
      }
    }
  }

  async onModuleInit() {
    // Start watching after a short delay to ensure SMB is mounted
    setTimeout(() => {
      this.startWatching();
    }, 2000);
  }

  async onModuleDestroy() {
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
    await this.stopWatching();
  }

  private startWatching() {
    try {
      this.logger.log(`Starting file watcher for: ${this.basePath}`);

      // On Windows, use polling for any SMB path (UNC or mapped drive Z:).
      // Native fs.watch fails on network/mapped drives with "UNKNOWN: unknown error, watch".
      const usePolling =
        process.platform === "win32" &&
        (this.basePath.startsWith("\\\\") ||
          /^[A-Za-z]:\\/.test(this.basePath));

      // Configure watcher options
      const watchOptions: {
        ignored: RegExp;
        persistent: boolean;
        ignoreInitial: boolean;
        awaitWriteFinish: {
          stabilityThreshold: number;
          pollInterval: number;
        };
        usePolling?: boolean;
        interval?: number;
        binaryInterval?: number;
      } = {
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: true, // Don't emit events for existing files
        awaitWriteFinish: {
          stabilityThreshold: 2000, // Wait 2s after file stops changing
          pollInterval: 100,
        },
      };

      if (usePolling) {
        watchOptions.usePolling = true;
        const pollingInterval = this.configService.get<number>(
          "SMB_POLLING_INTERVAL_MS",
          3000
        );
        watchOptions.interval = pollingInterval;
        watchOptions.binaryInterval = pollingInterval * 2;
        this.logger.log(
          `Using polling mode for Windows path with ${pollingInterval}ms interval`
        );
      }

      this.watcher = chokidar.watch(this.basePath, watchOptions);

      // Watch for file additions
      this.watcher.on("add", (filePath) => {
        // Async event emission to prevent blocking watcher
        setImmediate(() => {
          this.eventEmitter.emit("file.added", {
            path: filePath,
            relativePath: path.relative(this.basePath, filePath),
          });
        });
      });

      // Watch for file changes
      this.watcher.on("change", (filePath) => {
        // Async event emission to prevent blocking watcher
        setImmediate(() => {
          this.eventEmitter.emit("file.changed", {
            path: filePath,
            relativePath: path.relative(this.basePath, filePath),
          });
        });
      });

      // Watch for file deletions
      this.watcher.on("unlink", (filePath) => {
        // Async event emission to prevent blocking watcher
        setImmediate(() => {
          this.eventEmitter.emit("file.deleted", {
            path: filePath,
            relativePath: path.relative(this.basePath, filePath),
          });
        });
      });

      // Watch for folder additions
      this.watcher.on("addDir", (dirPath) => {
        // Normalize path separators to forward slashes for consistency with database
        const relativePath = path
          .relative(this.basePath, dirPath)
          .replace(/\\/g, "/");
        this.logger.log(
          `[WATCHER] Folder added detected: ${dirPath} -> relative: ${relativePath}`
        );

        // Async event emission to prevent blocking watcher
        setImmediate(() => {
          this.eventEmitter.emit("folder.added", {
            path: dirPath,
            relativePath: relativePath,
          });
        });
      });

      // Watch for folder deletions
      this.watcher.on("unlinkDir", (dirPath) => {
        // Async event emission to prevent blocking watcher
        setImmediate(() => {
          this.eventEmitter.emit("folder.deleted", {
            path: dirPath,
            relativePath: path
              .relative(this.basePath, dirPath)
              .replace(/\\/g, "/"),
          });
        });
      });

      // Error handling: single debounced restart to avoid spam and overlapping watchers
      this.watcher.on("error", (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`File watcher error: ${errorMessage}`);
        if (this.restartTimeoutId) return;
        this.restartTimeoutId = setTimeout(() => {
          this.restartTimeoutId = null;
          this.stopWatching().then(() => this.startWatching());
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
