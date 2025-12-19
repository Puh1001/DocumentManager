import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SmbService } from "./smb.service";
import { DocumentService } from "./document.service";
import { VersionService } from "./version.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { ChecksumUtil } from "../utils/checksum.util";
import { SystemUserUtil } from "../utils/system-user.util";
import * as path from "path";

@Injectable()
export class FolderSyncService {
  private readonly logger = new Logger(FolderSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smbService: SmbService,
    private readonly documentService: DocumentService,
    private readonly versionService: VersionService
  ) {}

  async syncWithFileSystem() {
    try {
      // Track seen paths during sync
      const seenPaths = new Set<string>();

      // Pass 1: Recursively scan SMB folder and sync with database
      const syncFolder = async (
        relativePath: string,
        parentId: string | null = null
      ) => {
        try {
          const files = await this.smbService.listDirectory(relativePath);

          for (const file of files) {
            try {
              // Track seen paths
              seenPaths.add(file.path);

              if (file.isDirectory) {
                // Check if folder exists in database (including deleted ones)
                const existing = await (
                  this.prisma as PrismaClientLike
                ).folder.findUnique({
                  where: { path: file.path },
                });

                let folderId: string;

                if (!existing) {
                  // Create folder in database
                  const folder = await (
                    this.prisma as PrismaClientLike
                  ).folder.create({
                    data: {
                      name: file.name,
                      path: file.path,
                      parentId,
                    },
                  });
                  folderId = folder.id;
                  this.logger.log(`Created folder: ${file.path}`);
                } else {
                  folderId = existing.id;

                  // If folder was deleted, restore it
                  if (existing.deletedAt) {
                    await (this.prisma as PrismaClientLike).folder.update({
                      where: { id: folderId },
                      data: {
                        deletedAt: null,
                        parentId,
                      },
                    });
                    this.logger.log(`Restored folder: ${file.path}`);
                  } else {
                    // Update parentId if it changed
                    if (existing.parentId !== parentId) {
                      await (this.prisma as PrismaClientLike).folder.update({
                        where: { id: folderId },
                        data: { parentId },
                      });
                    }
                  }
                }

                // Recursively sync subdirectories
                await syncFolder(file.path, folderId);
              } else {
                // Handle files - sync documents
                await this.syncDocument(file, parentId);
              }
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              this.logger.error(
                `Failed to sync item ${file.path}: ${errorMessage}`
              );
              // Continue with other items
            }
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          this.logger.error(
            `Failed to list directory ${relativePath}: ${errorMessage}`
          );
          throw error; // Re-throw để controller có thể handle
        }
      };

      // Start sync from root
      this.logger.log(
        "Starting file system sync (Pass 1: Sync file system)..."
      );
      await syncFolder("");
      this.logger.log("Pass 1 completed. Found paths: " + seenPaths.size);

      // Pass 2: Clean up orphans (deleted items)
      this.logger.log("Starting Pass 2: Clean up orphaned records...");

      // Clean up deleted folders
      const allFolders = await (
        this.prisma as PrismaClientLike
      ).folder.findMany({
        where: { deletedAt: null }, // Only active folders
      });

      let deletedFoldersCount = 0;
      for (const folder of allFolders) {
        if (!seenPaths.has(folder.path)) {
          // Folder deleted on file system
          await this.handleDeletedFolder(folder);
          deletedFoldersCount++;
        }
      }

      // Clean up deleted documents
      const allDocuments = await (
        this.prisma as PrismaClientLike
      ).document.findMany({
        where: { status: "ACTIVE" },
      });

      let deletedDocumentsCount = 0;
      for (const doc of allDocuments) {
        if (!seenPaths.has(doc.filePath)) {
          // File deleted on file system
          await this.handleDeletedDocument(doc);
          deletedDocumentsCount++;
        }
      }

      this.logger.log(
        `File system sync completed. Deleted: ${deletedFoldersCount} folders, ${deletedDocumentsCount} documents`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Sync failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Sync a single document from file system to database
   */
  private async syncDocument(
    file: { name: string; path: string; size?: number; modifiedAt?: Date },
    folderId: string | null
  ) {
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

      // Create document record
      // NOTE: Không tạo version file khi sync existing files
      // Chỉ lưu path đến file gốc, version sẽ được tạo khi file thay đổi hoặc upload qua UI
      await (this.prisma as PrismaClientLike).document.create({
        data: {
          name: documentName,
          fileName: file.name,
          fileType,
          fileSize,
          filePath: file.path, // Original file path (không copy vào versions/)
          checksum,
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

  /**
   * Handle deleted folder - soft delete with cascade
   */
  private async handleDeletedFolder(folder: {
    id: string;
    path: string;
  }): Promise<void> {
    try {
      // Soft delete folder
      await (this.prisma as PrismaClientLike).folder.update({
        where: { id: folder.id },
        data: { deletedAt: new Date() },
      });

      // Cascade: Mark children folders as deleted
      await (this.prisma as PrismaClientLike).folder.updateMany({
        where: {
          path: { startsWith: `${folder.path}/` },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      // Cascade: Mark documents as DELETED
      await (this.prisma as PrismaClientLike).document.updateMany({
        where: {
          folderId: folder.id,
          status: "ACTIVE",
        },
        data: { status: "DELETED" },
      });

      this.logger.log(`Soft deleted folder: ${folder.path}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to handle deleted folder ${folder.path}: ${errorMessage}`
      );
      // Continue with other items
    }
  }

  /**
   * Handle deleted document - soft delete
   */
  private async handleDeletedDocument(doc: {
    id: string;
    filePath: string;
  }): Promise<void> {
    try {
      await (this.prisma as PrismaClientLike).document.update({
        where: { id: doc.id },
        data: { status: "DELETED" },
      });

      this.logger.log(`Soft deleted document: ${doc.filePath}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to handle deleted document ${doc.filePath}: ${errorMessage}`
      );
      // Continue with other items
    }
  }
}
