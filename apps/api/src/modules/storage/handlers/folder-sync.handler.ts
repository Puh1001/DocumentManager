import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SmbService } from "../services/smb.service";
import { PrismaClientLike } from "@/common/types/prisma.types";

@Injectable()
export class FolderSyncHandler {
  private readonly logger = new Logger(FolderSyncHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smbService: SmbService
  ) {}

  /**
   * Sync a folder and its contents recursively
   * @param relativePath - Relative path of the folder to sync
   * @param parentId - Parent folder ID in database
   * @param seenPaths - Set to track seen paths during sync
   * @param syncDocumentCallback - Callback to sync documents
   */
  async syncFolder(
    relativePath: string,
    parentId: string | null,
    seenPaths: Set<string>,
    syncDocumentCallback: (
      file: { name: string; path: string; size?: number; modifiedAt?: Date },
      folderId: string | null
    ) => Promise<void>
  ): Promise<void> {
    try {
      const files = await this.smbService.listDirectory(relativePath);

      for (const file of files) {
        try {
          // Track seen paths
          seenPaths.add(file.path);

          if (file.isDirectory) {
            const folderId = await this.syncFolderRecord(
              file.name,
              file.path,
              parentId
            );

            // Recursively sync subdirectories
            await this.syncFolder(
              file.path,
              folderId,
              seenPaths,
              syncDocumentCallback
            );
          } else {
            // Handle files - sync documents
            await syncDocumentCallback(file, parentId);
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
  }

  /**
   * Sync a single folder record in the database
   * @returns The folder ID
   */
  private async syncFolderRecord(
    name: string,
    path: string,
    parentId: string | null
  ): Promise<string> {
    // Check if folder exists in database (including deleted ones)
    const existing = await (this.prisma as PrismaClientLike).folder.findUnique({
      where: { path },
    });

    if (!existing) {
      // Create folder in database
      const folder = await (this.prisma as PrismaClientLike).folder.create({
        data: {
          name,
          path,
          parentId,
        },
      });
      this.logger.log(`Created folder: ${path}`);
      return folder.id;
    }

    // Folder exists - update if needed
    const folderId = existing.id;

    // If folder was deleted, restore it
    if (existing.deletedAt) {
      await (this.prisma as PrismaClientLike).folder.update({
        where: { id: folderId },
        data: {
          deletedAt: null,
          parentId,
        },
      });
      this.logger.log(`Restored folder: ${path}`);
    } else {
      // Update parentId if it changed
      if (existing.parentId !== parentId) {
        await (this.prisma as PrismaClientLike).folder.update({
          where: { id: folderId },
          data: { parentId },
        });
      }
    }

    return folderId;
  }
}
