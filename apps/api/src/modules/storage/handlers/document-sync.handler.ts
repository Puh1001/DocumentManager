import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SmbService } from "../services/smb.service";
import { VersionService } from "../services/version.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { ChecksumUtil } from "../utils/checksum.util";
import { SystemUserUtil } from "../utils/system-user.util";
import { MimeTypeUtil } from "../utils/mime-type.util";
import * as path from "path";

@Injectable()
export class DocumentSyncHandler {
  private readonly logger = new Logger(DocumentSyncHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smbService: SmbService,
    private readonly versionService: VersionService
  ) {}

  /**
   * Sync a single document from file system to database
   */
  async syncDocument(
    file: { name: string; path: string; size?: number; modifiedAt?: Date },
    folderId: string | null
  ): Promise<void> {
    try {
      // Check if file exists before processing
      const fileExists = await this.smbService.exists(file.path);
      if (!fileExists) {
        this.logger.warn(`File does not exist: ${file.path}`);
        return;
      }

      // Find folder by path if folderId not provided
      let targetFolderId = folderId;
      if (!targetFolderId) {
        // Extract folder path from file path
        const folderPath = path.dirname(file.path);
        const folder = await (
          this.prisma as PrismaClientLike
        ).folder.findUnique({
          where: { path: folderPath },
        });
        if (!folder) {
          this.logger.warn(`Folder not found for file: ${file.path}`);
          return;
        }
        targetFolderId = folder.id;
      }

      // Check if document already exists by file path
      const existing = await (
        this.prisma as PrismaClientLike
      ).document.findFirst({
        where: {
          folderId: targetFolderId,
          fileName: file.name,
          status: "ACTIVE",
        },
      });

      if (existing) {
        // Document exists - check if file changed (compare checksum)
        // Use stream để tính checksum (không load toàn bộ file vào memory)
        try {
          const currentChecksum = await ChecksumUtil.calculateChecksum(
            this.smbService,
            file.path
          );

          if (existing.checksum === currentChecksum) {
            // File unchanged, skip
            return;
          }

          // File changed - create new version
          // Chỉ khi này mới đọc file để tạo version
          this.logger.log(`File changed, creating new version: ${file.path}`);
          const fileBuffer = await this.smbService.readFile(file.path);
          const systemUserId = await SystemUserUtil.getSystemUserId(
            this.prisma
          );
          await this.versionService.createVersion(
            existing.id,
            fileBuffer,
            systemUserId,
            "Synced from file system"
          );
        } catch (checksumError: unknown) {
          const errorMessage =
            checksumError instanceof Error
              ? checksumError.message
              : "Unknown error";
          this.logger.error(
            `Failed to calculate checksum for ${file.path}: ${errorMessage}`
          );
          // Skip this file, continue with others
          return;
        }
        return;
      }

      // Document doesn't exist - create it
      // Calculate checksum using stream (không load toàn bộ file vào memory)
      let checksum: string;
      try {
        checksum = await ChecksumUtil.calculateChecksum(
          this.smbService,
          file.path
        );
      } catch (checksumError: unknown) {
        const errorMessage =
          checksumError instanceof Error
            ? checksumError.message
            : "Unknown error";
        this.logger.error(
          `Failed to calculate checksum for ${file.path}: ${errorMessage}`
        );
        // Skip this file if checksum calculation fails
        return;
      }

      const fileType = path.extname(file.name).slice(1).toLowerCase();
      const documentName = path.basename(file.name, path.extname(file.name));

      // Get file size from stats (không cần đọc file)
      let fileSize: number;
      try {
        const fileStats = await this.smbService.getFileStats(file.path);
        fileSize = file.size || fileStats.size;
      } catch (statsError: unknown) {
        const errorMessage =
          statsError instanceof Error ? statsError.message : "Unknown error";
        this.logger.error(
          `Failed to get file stats for ${file.path}: ${errorMessage}`
        );
        // Use file.size if available, otherwise skip
        if (!file.size) {
          return;
        }
        fileSize = file.size;
      }

      // Extract MIME type
      const mimeType = MimeTypeUtil.getMimeType(fileType);

      // Extract file dates from file system
      let fileCreatedAt: Date | undefined;
      let fileModifiedAt: Date | undefined;
      try {
        const stats = await this.smbService.getFileStats(file.path);
        fileCreatedAt = stats.birthtime;
        fileModifiedAt = stats.mtime;
      } catch (statsError: unknown) {
        // Use provided dates if stats unavailable
        if (file.modifiedAt) {
          fileModifiedAt = file.modifiedAt;
        }
      }

      // Create document record
      // NOTE: Không tạo version file khi sync existing files
      // Chỉ lưu path đến file gốc, version sẽ được tạo khi file thay đổi hoặc upload qua UI
      await (this.prisma as PrismaClientLike).document.create({
        data: {
          name: documentName,
          fileName: file.name,
          fileType,
          mimeType,
          fileSize,
          filePath: file.path, // Original file path (không copy vào versions/)
          checksum,
          fileCreatedAt,
          fileModifiedAt,
          folderId: targetFolderId,
        },
      });

      this.logger.log(
        `Created document: ${file.path} (no version file created)`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to sync document ${file.path}: ${errorMessage}`
      );
      // Continue with other files even if one fails
    }
  }
}
