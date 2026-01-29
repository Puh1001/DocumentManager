import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SmbService } from "./smb.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import * as crypto from "crypto";
import * as path from "path";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { getSafeExtension } from "@/common/utils/file.util";

@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smbService: SmbService
  ) {}

  async createVersion(
    documentId: string,
    fileData: Buffer,
    userId: string,
    comment?: string
  ) {
    const document = await (
      this.prisma as PrismaClientLike
    ).document.findUnique({
      where: { id: documentId },
      include: {
        folder: true,
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!document) {
      throw CustomException.notFound(
        ErrorCodes.VERSION.DOCUMENT_NOT_FOUND,
        "Document not found"
      );
    }

    // Calculate next version
    const nextVersion = (document.versions[0]?.version || 0) + 1;

    // Generate version filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const ext = getSafeExtension(document.fileName);
    const versionFileName = `v${String(nextVersion).padStart(3, "0")}_${timestamp}_${userId.slice(0, 8)}${ext}`;

    // File paths
    // Normalize base folder path so we don't accidentally append "current" multiple times.
    // This is defensive against legacy / synced structures like ".../KPI/current/current".
    // Examples:
    // - Standard documents: folder.path = "DH/Documents"                 -> "DH/Documents/current/..."
    // - KPI attachments:     folder.path = "DH/KPI/current"              -> "DH/KPI/current/..." (no duplicate)
    // - Legacy bad data:     folder.path = "DH/KPI/current/current"      -> "DH/KPI/current/..." (fixed)
    let baseFolderPath = document.folder.path;
    while (baseFolderPath.endsWith("/current")) {
      baseFolderPath = baseFolderPath.replace(/\/current$/, "");
    }

    // Use Unique ID for physical file name on SMB (more stable format)
    // Keep original fileName in database for display to users
    const physicalFileName = `${document.id}${ext}`;
    const currentPath = `${baseFolderPath}/current/${physicalFileName}`;
    const versionPath = `${baseFolderPath}/version/${document.id}/${versionFileName}`;

    // Calculate checksum
    const checksum = crypto.createHash("sha256").update(fileData).digest("hex");

    // Save version file
    await this.smbService.writeFile(versionPath, fileData);

    // Save/update current file with ID-based name
    await this.smbService.writeFile(currentPath, fileData);

    // Create version record
    // document.fileName is already normalized (from findById which applies fixFileNameEncoding)
    const version = await (
      this.prisma as PrismaClientLike
    ).documentVersion.create({
      data: {
        documentId,
        version: nextVersion,
        fileName: document.fileName, // Already normalized via findById
        filePath: versionPath,
        fileSize: fileData.length,
        checksum,
        comment,
        createdBy: userId,
      },
    });

    // Update document (after DB update, cleanup old file for transaction safety)
    await (this.prisma as PrismaClientLike).document.update({
      where: { id: documentId },
      data: {
        filePath: currentPath,
        fileSize: fileData.length,
        checksum,
      },
    });

    // Clean up old file if it exists with different name (migration from original filename to ID-based)
    // Only if the old filePath exists and is different from the new currentPath
    // Moved after DB update for transaction safety - if DB update fails, old file remains
    if (document.filePath && document.filePath !== currentPath) {
      try {
        const oldFileExists = await this.smbService.exists(document.filePath);
        if (oldFileExists) {
          await this.smbService.deleteFile(document.filePath);
          this.logger.log(
            `Migrated file from original name to ID-based: ${document.filePath} -> ${currentPath}`,
            {
              documentId,
              oldPath: document.filePath,
              newPath: currentPath,
            }
          );
        }
      } catch (error: unknown) {
        // More specific error handling
        if (error instanceof Error) {
          // Don't fail if file already deleted (race condition)
          const nodeError = error as NodeJS.ErrnoException;
          if (nodeError.code !== "ENOENT") {
            this.logger.warn(
              `Failed to cleanup old file ${document.filePath}: ${error.message}`,
              { error: error.stack }
            );
          }
        } else {
          this.logger.warn(
            `Failed to cleanup old file ${document.filePath}: Unknown error`
          );
        }
      }
    }

    return version;
  }

  async listVersions(documentId: string) {
    return (this.prisma as PrismaClientLike).documentVersion.findMany({
      where: { documentId },
      orderBy: { version: "desc" },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async getVersion(documentId: string, version: number) {
    const docVersion = await (
      this.prisma as PrismaClientLike
    ).documentVersion.findUnique({
      where: {
        documentId_version: { documentId, version },
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!docVersion) {
      throw CustomException.notFound(
        ErrorCodes.VERSION.NOT_FOUND,
        "Version not found"
      );
    }

    return docVersion;
  }

  async downloadVersion(documentId: string, version: number) {
    const docVersion = await this.getVersion(documentId, version);
    const buffer = await this.smbService.readFile(docVersion.filePath);

    return {
      buffer,
      fileName: docVersion.fileName,
      version: docVersion.version,
    };
  }

  async restoreVersion(documentId: string, version: number, userId: string) {
    const oldVersion = await this.getVersion(documentId, version);
    const fileData = await this.smbService.readFile(oldVersion.filePath);

    // Create new version from restored content
    return this.createVersion(
      documentId,
      fileData,
      userId,
      `Restored from version ${version}`
    );
  }
}
