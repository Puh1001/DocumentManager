import { Injectable } from "@nestjs/common";
import { PrismaService, Prisma } from "@/common/prisma/prisma.service";
import { SmbService } from "./smb.service";
import { VersionService } from "./version.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { Express } from "express";
import * as crypto from "crypto";
import * as path from "path";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { fixFileNameEncoding } from "@/common/utils/encoding.util";

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smbService: SmbService,
    private readonly versionService: VersionService
  ) {}

  async findById(id: string) {
    const document = await (
      this.prisma as PrismaClientLike
    ).document.findUnique({
      where: { id },
      include: {
        folder: true,
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!document) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.NOT_FOUND,
        "Document not found"
      );
    }

    // Apply encoding fix as defense-in-depth
    // This fixes any corrupted data that may have been saved before the fix was implemented
    // or any edge cases where the fix didn't work during upload
    // fixFileNameEncoding() already normalizes to NFC
    document.fileName = fixFileNameEncoding(document.fileName);
    document.name = fixFileNameEncoding(document.name);

    return document;
  }

  async findByFolder(folderId: string) {
    const documents = await (this.prisma as PrismaClientLike).document.findMany({
      where: { folderId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    });

    // Apply encoding fix to all documents as defense-in-depth
    // fixFileNameEncoding() already normalizes to NFC
    return documents.map((doc) => ({
      ...doc,
      fileName: fixFileNameEncoding(doc.fileName),
      name: fixFileNameEncoding(doc.name),
    }));
  }

  async upload(
    folderId: string,
    file: Express.Multer.File,
    userId: string,
    name?: string,
    fileName?: string
  ) {
    if (!folderId) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.FOLDER_REQUIRED,
        "folderId is required"
      );
    }

    if (!file) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.FILE_REQUIRED,
        "file is required"
      );
    }

    const folder = await (this.prisma as PrismaClientLike).folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.FOLDER_NOT_FOUND,
        "Folder not found"
      );
    }

    // Ưu tiên dùng fileName từ body (gửi riêng như text field, UTF-8 thô)
    // Fallback về file.originalname nếu không có (đã được fix bởi interceptor)
    // Điều này tránh vấn đề encoding khi Multer parse filename từ Content-Disposition header
    const sourceFileName = fileName || file.originalname;
    const normalizedFileName = sourceFileName.normalize('NFC');
    const fileType = path.extname(normalizedFileName).slice(1).toLowerCase();
    const documentName =
      name || path.basename(normalizedFileName, path.extname(normalizedFileName)).normalize('NFC');
    const checksum = crypto
      .createHash("sha256")
      .update(file.buffer)
      .digest("hex");

    // Extract MIME type
    const mimeType = this.getMimeType(fileType);

    // File dates (from upload time, will be updated after file save)
    const now = new Date();

    // Calculate deletion expiry (72 hours from upload) - using milliseconds for DST safety
    const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
    const deletionExpiresAt = new Date(now.getTime() + SEVENTY_TWO_HOURS_MS);

    // Create document entry
    // Use normalized fileName and documentName for database storage
    const document = await (this.prisma as PrismaClientLike).document.create({
      data: {
        name: documentName, // Already normalized above
        fileName: normalizedFileName, // Normalized to NFC
        fileType,
        mimeType,
        fileSize: file.size,
        filePath: "", // Will be updated after file save
        checksum,
        fileCreatedAt: now,
        fileModifiedAt: now,
        folderId,
        // Deletion tracking fields
        uploadedBy: userId,
        uploadedAt: now,
        deletionExpiresAt,
      },
    });

    // Save file using version service (creates v1)
    const version = await this.versionService.createVersion(
      document.id,
      file.buffer,
      userId,
      "Initial upload"
    );

    // Get file stats from saved file to extract actual file dates
    try {
      const stats = await this.smbService.getFileStats(version.filePath);
      await (this.prisma as PrismaClientLike).document.update({
        where: { id: document.id },
        data: {
          filePath: version.filePath,
          fileCreatedAt: stats.birthtime,
          fileModifiedAt: stats.mtime,
        },
      });
    } catch (error) {
      // If stats unavailable, just update filePath
      await (this.prisma as PrismaClientLike).document.update({
        where: { id: document.id },
        data: { filePath: version.filePath },
      });
    }

    return this.findById(document.id);
  }

  async updateFile(
    documentId: string,
    file: Express.Multer.File,
    userId: string,
    comment?: string
  ) {
    const document = await this.findById(documentId);
    const now = new Date();

    // Calculate new deletion expiry (72 hours from update) - reset deletion window
    const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
    const newDeletionExpiresAt = new Date(now.getTime() + SEVENTY_TWO_HOURS_MS);

    // Create new version and reset deletion tracking fields
    await this.versionService.createVersion(
      documentId,
      file.buffer,
      userId,
      comment
    );

    // Reset deletion tracking: update uploadedBy, uploadedAt, and deletionExpiresAt
    // This gives user a fresh 72-hour window to delete the updated file
    await (this.prisma as PrismaClientLike).document.update({
      where: { id: documentId },
      data: {
        uploadedBy: userId,
        uploadedAt: now,
        deletionExpiresAt: newDeletionExpiresAt,
      },
    });

    return this.findById(documentId);
  }

  async getStream(id: string) {
    const document = await this.findById(id);
    return this.smbService.readFileStream(document.filePath);
  }

  async download(id: string) {
    const document = await this.findById(id);
    const buffer = await this.smbService.readFile(document.filePath);

    return {
      buffer,
      fileName: document.fileName,
      mimeType: this.getMimeType(document.fileType),
    };
  }

  async archive(id: string) {
    return (this.prisma as PrismaClientLike).document.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  }

  async delete(id: string) {
    return (this.prisma as PrismaClientLike).document.update({
      where: { id },
      data: { status: "DELETED" },
    });
  }

  async rename(documentId: string, newName: string, newFileName: string, userId: string) {
    const document = await this.findById(documentId);

    // Validate new filename has extension
    const ext = path.extname(newFileName);
    if (!ext) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.INVALID_FILENAME,
        "Filename must include extension"
      );
    }

    // Validate filename matches the original extension (to prevent changing file type)
    const originalExt = path.extname(document.fileName).toLowerCase();
    const newExt = ext.toLowerCase();
    if (originalExt !== newExt) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.INVALID_FILENAME,
        "Cannot change file extension"
      );
    }

    // Fix encoding for new name and filename
    // fixFileNameEncoding() already normalizes to NFC
    const fixedName = fixFileNameEncoding(newName);
    const fixedFileName = fixFileNameEncoding(newFileName);

    // Update document name and fileName
    await (this.prisma as PrismaClientLike).document.update({
      where: { id: documentId },
      data: {
        name: fixedName,
        fileName: fixedFileName,
      },
    });

    // Create audit log
    try {
      await (this.prisma as PrismaClientLike).auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          resourceType: "Document",
          resourceId: documentId,
          details: {
            oldName: document.name,
            oldFileName: document.fileName,
            newName: fixedName,
            newFileName: fixedFileName,
            action: "rename",
          },
        },
      });
    } catch (error) {
      // Don't fail if audit log fails
      console.error("Failed to create audit log for rename:", error);
    }

    return this.findById(documentId);
  }

  async search(query: string, folderId?: string) {
    const where: Prisma.DocumentWhereInput = {
      status: "ACTIVE",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { fileName: { contains: query, mode: "insensitive" } },
      ],
    };

    if (folderId) {
      where.folderId = folderId;
    }

    const documents = await (this.prisma as PrismaClientLike).document.findMany({
      where,
      include: { folder: true },
      take: 50,
    });

    // Apply encoding fix to all documents as defense-in-depth
    // fixFileNameEncoding() already normalizes to NFC
    return documents.map((doc) => ({
      ...doc,
      fileName: fixFileNameEncoding(doc.fileName),
      name: fixFileNameEncoding(doc.name),
    }));
  }

  async count(): Promise<number> {
    return (this.prisma as PrismaClientLike).document.count({
      where: { status: "ACTIVE" },
    });
  }

  async countRecent(days: number = 7): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return (this.prisma as PrismaClientLike).document.count({
      where: {
        status: "ACTIVE",
        createdAt: {
          gte: date,
        },
      },
    });
  }

  private getMimeType(fileType: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    };

    return mimeTypes[fileType] || "application/octet-stream";
  }
}
