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

    return document;
  }

  async findByFolder(folderId: string) {
    return (this.prisma as PrismaClientLike).document.findMany({
      where: { folderId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  }

  async upload(
    folderId: string,
    file: Express.Multer.File,
    userId: string,
    name?: string
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

    const fileName = file.originalname;
    const fileType = path.extname(fileName).slice(1).toLowerCase();
    const documentName =
      name || path.basename(fileName, path.extname(fileName));
    const checksum = crypto
      .createHash("sha256")
      .update(file.buffer)
      .digest("hex");

    // Extract MIME type
    const mimeType = this.getMimeType(fileType);

    // File dates (from upload time, will be updated after file save)
    const now = new Date();

    // Create document entry
    const document = await (this.prisma as PrismaClientLike).document.create({
      data: {
        name: documentName,
        fileName,
        fileType,
        mimeType,
        fileSize: file.size,
        filePath: "", // Will be updated after file save
        checksum,
        fileCreatedAt: now,
        fileModifiedAt: now,
        folderId,
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
    await this.findById(documentId);

    // Create new version
    await this.versionService.createVersion(
      documentId,
      file.buffer,
      userId,
      comment
    );

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

    return (this.prisma as PrismaClientLike).document.findMany({
      where,
      include: { folder: true },
      take: 50,
    });
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
