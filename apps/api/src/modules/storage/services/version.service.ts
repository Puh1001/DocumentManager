import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SmbService } from "./smb.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import * as crypto from "crypto";
import * as path from "path";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

@Injectable()
export class VersionService {
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
    const ext = path.extname(document.fileName);
    const versionFileName = `v${String(nextVersion).padStart(3, "0")}_${timestamp}_${userId.slice(0, 8)}${ext}`;

    // File paths
    const currentPath = `${document.folder.path}/current/${document.fileName}`;
    const versionPath = `${document.folder.path}/versions/${document.id}/${versionFileName}`;

    // Calculate checksum
    const checksum = crypto.createHash("sha256").update(fileData).digest("hex");

    // Save version file
    await this.smbService.writeFile(versionPath, fileData);

    // Save/update current file
    await this.smbService.writeFile(currentPath, fileData);

    // Create version record
    const version = await (
      this.prisma as PrismaClientLike
    ).documentVersion.create({
      data: {
        documentId,
        version: nextVersion,
        fileName: document.fileName,
        filePath: versionPath,
        fileSize: fileData.length,
        checksum,
        comment,
        createdBy: userId,
      },
    });

    // Update document
    await (this.prisma as PrismaClientLike).document.update({
      where: { id: documentId },
      data: {
        filePath: currentPath,
        fileSize: fileData.length,
        checksum,
      },
    });

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
