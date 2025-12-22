import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import * as path from "path";

@Injectable()
export class SyncDeletionHandler {
  private readonly logger = new Logger(SyncDeletionHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle deleted folder - soft delete with cascade
   */
  async handleDeletedFolder(folder: {
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
  async handleDeletedDocument(doc: {
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

  /**
   * Soft delete a single file from database (public method for real-time sync)
   */
  async deleteSingleFile(
    relativePath: string
  ): Promise<{ folderId: string | null; documentId?: string } | null> {
    try {
      // Extract fileName and folder path from relativePath
      const fileName = path.basename(relativePath);
      const folderPath = path.dirname(relativePath);

      // Find folder by path
      const folder = await (this.prisma as PrismaClientLike).folder.findUnique({
        where: { path: folderPath },
      });

      if (!folder) {
        this.logger.warn(`Folder not found for deleted file: ${relativePath}`);
        return null;
      }

      // Find document by fileName and folderId (more reliable than filePath matching)
      const document = await (
        this.prisma as PrismaClientLike
      ).document.findFirst({
        where: {
          folderId: folder.id,
          fileName: fileName,
          status: "ACTIVE",
        },
      });

      if (!document) {
        this.logger.warn(
          `Document not found for deleted file: ${relativePath}`
        );
        return null;
      }

      // Soft delete document
      await (this.prisma as PrismaClientLike).document.update({
        where: { id: document.id },
        data: { status: "DELETED" },
      });

      this.logger.log(
        `Soft deleted document: ${relativePath} (${document.id})`
      );

      return {
        folderId: document.folderId,
        documentId: document.id,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to delete single file ${relativePath}: ${errorMessage}`
      );
      return null;
    }
  }
}
