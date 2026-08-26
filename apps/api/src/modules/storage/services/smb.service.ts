import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: Date;
}

/**
 * SMB Service for accessing Windows Shared Folder via file system
 *
 * Platform-aware implementation:
 * - Development (Windows): Direct UNC paths or mounted drive
 * - Production (Linux): Mounted SMB share path
 *
 * Configuration:
 * - Server: 10.0.60.30
 * - Share: Public
 * - Base Path: IT-Information Technology Dept\devTest
 * - Domain: bestpacific.com
 */
@Injectable()
export class SmbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmbService.name);
  private basePath: string;
  private readonly platform: "windows" | "linux";
  private connectionTestTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {
    this.platform = process.platform === "win32" ? "windows" : "linux";

    if (this.platform === "windows") {
      // Development: Windows UNC path or mounted drive
      const useMountedDrive = this.configService.get<boolean>(
        "SMB_USE_MOUNTED_DRIVE",
        false,
      );

      if (useMountedDrive) {
        // Use mounted drive (e.g., Z:\)
        // Note: If drive is mapped to server root, include share name in path
        const drive = this.configService.get<string>("SMB_MOUNTED_DRIVE", "X:");
        const share = this.configService.get<string>("SMB_SHARE", "Public");
        const basePath = this.configService.get<string>("SMB_BASE_PATH", "");

        // Include share name: Z:\Public\IT-Information Technology Dept\devTest
        const fullBasePath = basePath
          ? path.join(drive, share, basePath.replace(/\\/g, path.sep))
          : path.join(drive, share);

        this.basePath = fullBasePath;
        this.logger.log(`Using mounted drive: ${this.basePath}`);
      } else {
        // Direct UNC path
        const server = this.configService.get<string>(
          "SMB_SERVER",
          "10.0.60.30",
        );
        const share = this.configService.get<string>("SMB_SHARE", "Public");
        const basePath = this.configService.get<string>(
          "SMB_BASE_PATH",
          "IT-Information Technology Dept\\devTest",
        );
        // UNC path: \\10.0.60.30\Public\IT-Information Technology Dept\devTest
        this.basePath = `\\\\${server}\\${share}\\${basePath}`;
        this.logger.log(`Using UNC path: ${this.basePath}`);
      }
    } else {
      // Production: Linux mounted path (from Docker volume)
      const mountPath = this.configService.get<string>(
        "SMB_MOUNT_PATH",
        "/shared",
      );
      const basePath = this.configService.get<string>("SMB_BASE_PATH", "");

      // Append basePath to mountPath if provided
      // Example: /shared + IT-Information Technology Dept/devTest
      // This ensures we sync only the specified subfolder, not the entire share
      if (basePath) {
        // Normalize path separators for Linux (convert backslashes to forward slashes)
        const normalizedBasePath = basePath.replace(/\\/g, "/");
        this.basePath = path.join(mountPath, normalizedBasePath);
        this.logger.log(
          `Using mounted path with basePath: ${this.basePath} (mountPath: ${mountPath}, basePath: ${basePath})`,
        );
      } else {
        this.basePath = mountPath;
        this.logger.warn(
          `SMB_BASE_PATH not set in production! Syncing from root: ${this.basePath}. This may sync entire share instead of specific folder.`,
        );
      }
    }
  }

  async onModuleInit() {
    // Skip connection test in test environment to avoid noisy logs/timers
    const isTestEnv =
      process.env.NODE_ENV === "test" ||
      this.configService.get<string>("NODE_ENV") === "test";
    if (isTestEnv) {
      return;
    }

    // Test connection on startup (non-blocking)
    // Store timer reference so it can be cleared if needed
    // Use unref() to prevent timer from keeping process alive
    this.connectionTestTimer = setTimeout(async () => {
      try {
        await this.testConnection();
        this.logger.log("SMB path accessible");
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(`SMB path not accessible: ${errorMessage}`);
        if (this.platform === "linux") {
          this.logger.warn("Make sure SMB share is mounted on host: /mnt/smb");
        } else {
          this.logger.warn(
            "Make sure you have network access to SMB share or mount drive first",
          );
        }
      } finally {
        this.connectionTestTimer = null;
      }
    }, 1000);
    // Use unref() to prevent timer from keeping the process alive
    if (
      this.connectionTestTimer &&
      typeof this.connectionTestTimer.unref === "function"
    ) {
      this.connectionTestTimer.unref();
    }
  }

  async onModuleDestroy() {
    // Clear connection test timer if it exists
    if (this.connectionTestTimer) {
      clearTimeout(this.connectionTestTimer);
      this.connectionTestTimer = null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await fs.promises.access(this.basePath, fs.constants.R_OK);

      // Additional validation: check if it's a directory
      const stats = await fs.promises.stat(this.basePath);
      if (!stats.isDirectory()) {
        const errorMsg = `SMB basePath is not a directory: ${this.basePath}`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      this.logger.log(`SMB basePath validated: ${this.basePath}`);
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Don't log errors in test environment to avoid noisy test output
      const isTestEnv =
        process.env.NODE_ENV === "test" ||
        this.configService.get<string>("NODE_ENV") === "test";
      if (!isTestEnv) {
        this.logger.error(`SMB connection test error: ${errorMessage}`);
        this.logger.error(
          `SMB basePath: ${this.basePath}, platform: ${this.platform}`,
        );
      }
      throw error;
    }
  }

  /**
   * Get full path from relative path
   */
  private getFullPath(relativePath: string): string {
    if (!relativePath) {
      return this.basePath;
    }
    // Normalize path separators
    const normalized = relativePath.replace(/\\/g, path.sep);
    return path.join(this.basePath, normalized);
  }

  /**
   * List directory contents
   */
  async listDirectory(relativePath: string = ""): Promise<FileInfo[]> {
    const fullPath = this.getFullPath(relativePath);

    try {
      const entries = await fs.promises.readdir(fullPath, {
        withFileTypes: true,
      });

      const fileInfos: FileInfo[] = [];

      for (const entry of entries) {
        const entryPath = path.join(relativePath, entry.name);
        const entryFullPath = path.join(fullPath, entry.name);
        const stats = await fs.promises.stat(entryFullPath);

        fileInfos.push({
          name: entry.name,
          path: entryPath.replace(/\\/g, "/"), // Normalize to forward slashes
          isDirectory: entry.isDirectory(),
          size: entry.isFile() ? stats.size : undefined,
          modifiedAt: stats.mtime,
        });
      }

      // Sort: directories first, then by name
      return fileInfos.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Don't log errors in test environment to avoid noisy test output
      const isTestEnv =
        process.env.NODE_ENV === "test" ||
        this.configService.get<string>("NODE_ENV") === "test";
      if (!isTestEnv) {
        this.logger.error(
          `Failed to list directory ${fullPath}: ${errorMessage}`,
        );
      }
      throw error;
    }
  }

  /**
   * Read file as Buffer
   */
  async readFile(relativePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(relativePath);
    return fs.promises.readFile(fullPath);
  }

  /**
   * Read file as Stream
   * Validates file exists and is readable before creating stream
   */
  async readFileStream(relativePath: string): Promise<Readable> {
    const fullPath = this.getFullPath(relativePath);

    try {
      await fs.promises.access(fullPath, fs.constants.F_OK | fs.constants.R_OK);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        throw CustomException.notFound(
          ErrorCodes.DOCUMENT.NOT_FOUND,
          `File not found: ${relativePath}`,
        );
      }
      throw CustomException.internalServerError(
        ErrorCodes.DOCUMENT.NOT_FOUND,
        `Cannot read file: ${nodeError.message}`,
      );
    }

    const stream = fs.createReadStream(fullPath);
    stream.on("error", (err) => {
      this.logger.error(`Stream error for ${relativePath}:`, err.message);
    });
    return stream;
  }

  /**
   * Write file
   */
  async writeFile(relativePath: string, data: Buffer): Promise<void> {
    const fullPath = this.getFullPath(relativePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    if (dir && dir !== "." && dir !== path.sep) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, data);
  }

  /**
   * Create directory
   */
  async createDirectory(relativePath: string): Promise<void> {
    const fullPath = this.getFullPath(relativePath);

    try {
      await fs.promises.mkdir(fullPath, { recursive: true });
    } catch (error: unknown) {
      // Ignore error if directory already exists
      if (
        error instanceof Error &&
        (error as NodeJS.ErrnoException).code !== "EEXIST"
      ) {
        throw error;
      }
    }
  }

  /**
   * Delete file
   */
  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.getFullPath(relativePath);
    await fs.promises.unlink(fullPath);
  }

  /**
   * Delete directory (recursive)
   */
  async deleteDirectory(relativePath: string): Promise<void> {
    const fullPath = this.getFullPath(relativePath);
    await fs.promises.rm(fullPath, { recursive: true, force: true });
  }

  /**
   * Check if path exists
   */
  async exists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(relativePath);
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(relativePath: string): Promise<fs.Stats> {
    const fullPath = this.getFullPath(relativePath);
    return fs.promises.stat(fullPath);
  }

  /**
   * Rename file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    const fullOldPath = this.getFullPath(oldPath);
    const fullNewPath = this.getFullPath(newPath);
    await fs.promises.rename(fullOldPath, fullNewPath);
  }

  /**
   * Copy file
   */
  async copyFile(srcPath: string, destPath: string): Promise<void> {
    const fullSrcPath = this.getFullPath(srcPath);
    const fullDestPath = this.getFullPath(destPath);
    const destDir = path.dirname(fullDestPath);

    // Ensure destination directory exists
    await fs.promises.mkdir(destDir, { recursive: true });
    await fs.promises.copyFile(fullSrcPath, fullDestPath);
  }
}
