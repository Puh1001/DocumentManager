import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { FolderService } from "@/modules/storage/services/folder.service";
import { VersionService } from "@/modules/storage/services/version.service";
import { DocumentService } from "@/modules/storage/services/document.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { fixFileNameEncoding } from "@/common/utils/encoding.util";
import * as crypto from "crypto";
import * as path from "path";
import { Readable } from "stream";
import { Express } from "express";

/** Allowed file extensions for client uploads (lowercase). */
const CLIENT_ALLOWED_EXTENSIONS = [
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "pdf",
] as const;

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export interface ListClientFilesResult {
  data: Array<{
    id: string;
    name: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string | null;
    uploadedAt: Date | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly folderService: FolderService,
    private readonly versionService: VersionService,
    private readonly documentService: DocumentService,
  ) {}

  async list(filters: {
    search?: string;
    fileType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<ListClientFilesResult> {
    const { clientFolderId } =
      await this.folderService.ensureClientFolder();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {
      folderId: clientFolderId,
      status: "ACTIVE",
    };

    if (filters.search?.trim()) {
      const term = filters.search.trim().slice(0, 200);
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { fileName: { contains: term, mode: "insensitive" } },
      ];
    }
    if (filters.fileType?.trim()) {
      const ext = filters.fileType.trim().toLowerCase().replace(/^\./, "");
      where.fileType = ext;
    }
    if (filters.dateFrom || filters.dateTo) {
      const uploadedAt: { gte?: Date; lte?: Date } = {};
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        if (!isNaN(from.getTime())) uploadedAt.gte = from;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        if (!isNaN(to.getTime())) uploadedAt.lte = to;
      }
      if (Object.keys(uploadedAt).length > 0) where.uploadedAt = uploadedAt;
    }

    const [data, total] = await Promise.all([
      (this.prisma as PrismaClientLike).document.findMany({
        where,
        orderBy: { uploadedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          uploadedBy: true,
          uploadedAt: true,
          createdAt: true,
        },
      }),
      (this.prisma as PrismaClientLike).document.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data: data.map((d) => ({
        ...d,
        fileName: fixFileNameEncoding(d.fileName),
        name: fixFileNameEncoding(d.name),
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async upload(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ id: string; name: string; fileName: string; fileType: string }> {
    if (!file?.buffer) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.FILE_REQUIRED,
        "file is required",
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw CustomException.badRequest(
        ErrorCodes.CLIENT.FILE_TOO_LARGE,
        `File size must not exceed ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`,
      );
    }

    const ext = path.extname(file.originalname || "").slice(1).toLowerCase();
    if (
      !CLIENT_ALLOWED_EXTENSIONS.includes(
        ext as (typeof CLIENT_ALLOWED_EXTENSIONS)[number],
      )
    ) {
      throw CustomException.badRequest(
        ErrorCodes.INVALID_INPUT,
        `Allowed types: ${CLIENT_ALLOWED_EXTENSIONS.join(", ")}`,
      );
    }

    const { clientFolderId } =
      await this.folderService.ensureClientFolder();
    // Client files don't require a document level (unlike ISO documents)
    // levelId will be null for client files

    const sourceFileName = file.originalname || `file.${ext}`;
    const normalizedFileName = fixFileNameEncoding(
      sourceFileName.normalize("NFC"),
    );
    const documentName = path
      .basename(normalizedFileName, path.extname(normalizedFileName))
      .normalize("NFC");
    const fileType = ext;
    const mimeType = MIME_TYPES[fileType] || "application/octet-stream";
    const checksum = crypto
      .createHash("sha256")
      .update(file.buffer)
      .digest("hex");
    const now = new Date();
    const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
    const deletionExpiresAt = new Date(
      now.getTime() + SEVENTY_TWO_HOURS_MS,
    );

    const document = await (this.prisma as PrismaClientLike).document.create({
      data: {
        name: documentName,
        fileName: normalizedFileName,
        fileType,
        mimeType,
        fileSize: file.size,
        filePath: "",
        checksum,
        fileCreatedAt: now,
        fileModifiedAt: now,
        folderId: clientFolderId,
        // Client files don't require a level; levelId is nullable after migration.
        // Cast via unknown to avoid explicit any while staying compatible with Prisma typing.
        levelId: null as unknown as Prisma.DocumentUncheckedCreateInput["levelId"],
        uploadedBy: userId,
        uploadedAt: now,
        deletionExpiresAt,
      },
    });

    await this.versionService.createVersion(
      document.id,
      file.buffer,
      userId,
      "Client upload",
    );

    const updated = await (this.prisma as PrismaClientLike).document.findUnique(
      {
        where: { id: document.id },
        select: { id: true, name: true, fileName: true, fileType: true },
      },
    );
    if (!updated) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.NOT_FOUND,
        "Document not found after upload",
      );
    }
    this.logger.log(
      `Client file uploaded: id=${updated.id} name=${updated.fileName} by=${userId}`,
    );
    return {
      id: updated.id,
      name: fixFileNameEncoding(updated.name),
      fileName: fixFileNameEncoding(updated.fileName),
      fileType: updated.fileType,
    };
  }

  async delete(documentId: string, _userId: string): Promise<void> {
    const document = await (this.prisma as PrismaClientLike).document.findUnique(
      {
        where: { id: documentId },
        include: { folder: true },
      },
    );
    if (!document) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.NOT_FOUND,
        "Document not found",
      );
    }
    const { clientFolderId } =
      await this.folderService.ensureClientFolder();
    if (document.folderId !== clientFolderId) {
      throw CustomException.forbidden(
        ErrorCodes.DOCUMENT.FOLDER_ACCESS_DENIED,
        "Document is not in Client folder",
      );
    }

    // Soft-delete in database to keep audit/history
    await this.documentService.delete(documentId);

    // Ensure physical files on SMB are also removed (current file + versions)
    await this.documentService.deletePhysicalFilesFromStorage(documentId);

    this.logger.log(`Client file deleted (DB + SMB): id=${documentId}`);
  }

  /**
   * Get stream for a client file (for viewer). Verifies document is in Client folder.
   */
  async getStream(
    documentId: string,
  ): Promise<{ stream: Readable; fileType: string }> {
    const document = await (this.prisma as PrismaClientLike).document.findUnique(
      {
        where: { id: documentId },
        select: {
          id: true,
          folderId: true,
          fileType: true,
        },
      },
    );
    if (!document) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.NOT_FOUND,
        "Document not found",
      );
    }
    const { clientFolderId } =
      await this.folderService.ensureClientFolder();
    if (document.folderId !== clientFolderId) {
      throw CustomException.forbidden(
        ErrorCodes.DOCUMENT.FOLDER_ACCESS_DENIED,
        "Document is not in Client folder",
      );
    }

    const stream = await this.documentService.getStream(documentId);
    const fileType = (document.fileType || "").toLowerCase();
    return { stream, fileType };
  }
}
