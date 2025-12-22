import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SmbService } from "./smb.service";
import { DocumentSyncHandler } from "../handlers/document-sync.handler";
import { FolderSyncHandler } from "../handlers/folder-sync.handler";
import { SyncDeletionHandler } from "../handlers/sync-deletion.handler";
import { PrismaClientLike } from "@/common/types/prisma.types";
import * as path from "path";

@Injectable()
export class FolderSyncService {
  private readonly logger = new Logger(FolderSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smbService: SmbService,
    private readonly documentSyncHandler: DocumentSyncHandler,
    private readonly folderSyncHandler: FolderSyncHandler,
    private readonly syncDeletionHandler: SyncDeletionHandler
  ) {}

  async syncWithFileSystem() {
    try {
      // Track seen paths during sync
      const seenPaths = new Set<string>();

      // Pass 1: Recursively scan SMB folder and sync with database
      this.logger.log(
        "Starting file system sync (Pass 1: Sync file system)..."
      );
      await this.folderSyncHandler.syncFolder(
        "",
        null,
        seenPaths,
        async (file, folderId) => {
          await this.documentSyncHandler.syncDocument(file, folderId);
        }
      );
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
          await this.syncDeletionHandler.handleDeletedFolder(folder);
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
          await this.syncDeletionHandler.handleDeletedDocument(doc);
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
   * Sync a single file from file system to database (public method for real-time sync)
   */
  async syncSingleFile(
    relativePath: string
  ): Promise<{ folderId: string | null; documentId?: string } | null> {
    try {
      // Get file info from SMB
      const fileName = path.basename(relativePath);
      const fileStats = await this.smbService.getFileStats(relativePath);

      const file = {
        name: fileName,
        path: relativePath,
        size: fileStats.size,
        modifiedAt: fileStats.mtime,
      };

      // Find folder by path
      const folderPath = path.dirname(relativePath);
      const folder = await (this.prisma as PrismaClientLike).folder.findUnique({
        where: { path: folderPath },
      });

      if (!folder) {
        this.logger.warn(`Folder not found for file: ${relativePath}`);
        return null;
      }

      // Sync document
      await this.documentSyncHandler.syncDocument(file, folder.id);

      // Get created/updated document ID
      const document = await (
        this.prisma as PrismaClientLike
      ).document.findFirst({
        where: {
          folderId: folder.id,
          fileName: fileName,
          status: "ACTIVE",
        },
      });

      return {
        folderId: folder.id,
        documentId: document?.id,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to sync single file ${relativePath}: ${errorMessage}`
      );
      return null;
    }
  }

  /**
   * Soft delete a single file from database (public method for real-time sync)
   */
  async deleteSingleFile(
    relativePath: string
  ): Promise<{ folderId: string | null; documentId?: string } | null> {
    return this.syncDeletionHandler.deleteSingleFile(relativePath);
  }
}
