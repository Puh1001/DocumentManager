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
import { DocumentLevelService } from "./document-level.service";
import { UpdateIsoMetadataDto } from "../dto/update-iso-metadata.dto";

export interface FindAllDocumentsFilters {
  status?: "ACTIVE" | "ARCHIVED" | "DELETED";
  departmentId?: string;
  /** When set (e.g. for non-admin users), restrict to documents in these departments. */
  departmentIdsForFilter?: string[];
  /** Filter by document level ID. */
  level?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smbService: SmbService,
    private readonly versionService: VersionService,
    private readonly documentLevelService: DocumentLevelService
  ) {}

  async findById(id: string) {
    const document = await (
      this.prisma as PrismaClientLike
    ).document.findUnique({
      where: { id },
      include: {
        folder: true,
        level: true,
        preparer: {
          select: { id: true, username: true, fullName: true },
        },
        reviewer: {
          select: { id: true, username: true, fullName: true },
        },
        approver: {
          select: { id: true, username: true, fullName: true },
        },
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
    const documents = await (this.prisma as PrismaClientLike).document.findMany(
      {
        where: { folderId, status: "ACTIVE" },
        orderBy: { name: "asc" },
      }
    );

    // Apply encoding fix to all documents as defense-in-depth
    // fixFileNameEncoding() already normalizes to NFC
    return documents.map((doc) => ({
      ...doc,
      fileName: fixFileNameEncoding(doc.fileName),
      name: fixFileNameEncoding(doc.name),
    }));
  }

  async findAll(filters?: FindAllDocumentsFilters) {
    const where: Prisma.DocumentWhereInput = {};
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    // Status filter: default to ACTIVE when not specified so list does not show DELETED
    const status =
      filters?.status === "ACTIVE" ||
      filters?.status === "ARCHIVED" ||
      filters?.status === "DELETED"
        ? filters.status
        : "ACTIVE";
    where.status = status as Prisma.EnumDocumentStatusFilter["equals"];

    // Always exclude version folders and Delete_files folders from main document listing
    // Exclude folders whose path contains "/versions/" or "\versions\" (Windows paths)
    // Exclude folders whose path contains "Delete_files", "delete files", or "Deleted files" (case-insensitive, various formats)
    // Additionally, only include folders under the ISO_documents section so the flat list
    // behaves as an ISO documents view and does not show KPI or Maintenance files.
    const folderWhere: Prisma.FolderWhereInput = {
      AND: [
        { path: { not: { contains: "/versions/" } } },
        { path: { not: { contains: "\\versions\\" } } },
        // Exclude Delete_files folders (case-insensitive matching for various formats)
        { path: { not: { contains: "/Delete_files" } } },
        { path: { not: { contains: "\\Delete_files" } } },
        { path: { not: { contains: "/delete files" } } },
        { path: { not: { contains: "\\delete files" } } },
        { path: { not: { contains: "/Deleted files" } } },
        { path: { not: { contains: "\\Deleted files" } } },
        // Only include folders under ISO_documents section (documents area)
        {
          OR: [
            // New canonical layout: "{dept}/ISO_documents" and children
            { path: { contains: "/ISO_documents" } },
            { path: { contains: "\\ISO_documents" } },
            // Safety for rare root/legacy layouts
            { path: { endsWith: "/ISO_documents" } },
            { path: { equals: "ISO_documents" } },
          ],
        },
      ],
    };

    // Department filter (via folder): access control and/or explicit department filter
    // When departmentIdsForFilter is set (including []), restrict to those departments or none
    if (filters?.departmentIdsForFilter !== undefined) {
      folderWhere.departmentId =
        filters.departmentId?.trim() &&
        filters.departmentIdsForFilter.includes(filters.departmentId)
          ? filters.departmentId
          : filters.departmentIdsForFilter.length > 0
            ? { in: filters.departmentIdsForFilter }
            : { in: [] };
    } else if (filters?.departmentId?.trim()) {
      folderWhere.departmentId = filters.departmentId;
    }

    where.folder = folderWhere;

    // Level filter (by document level ID)
    if (filters?.level?.trim()) {
      where.levelId = filters.level;
    }

    const [documents, uniquePairs] = await Promise.all([
      (this.prisma as PrismaClientLike).document.findMany({
        where,
        skip,
        take: limit,
        include: {
          folder: {
            include: {
              department: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          level: true,
          preparer: {
            select: { id: true, username: true, fullName: true },
          },
          reviewer: {
            select: { id: true, username: true, fullName: true },
          },
          approver: {
            select: { id: true, username: true, fullName: true },
          },
          _count: {
            select: {
              versions: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      (this.prisma as PrismaClientLike).document.groupBy({
        where,
        by: ["folderId", "fileName"],
      }),
    ]);

    const total = uniquePairs.length;
    const totalPages = Math.ceil(total / limit);

    // Apply encoding fix to all documents as defense-in-depth
    // fixFileNameEncoding() already normalizes to NFC
    const fixedDocuments = documents.map((doc) => ({
      ...doc,
      fileName: fixFileNameEncoding(doc.fileName),
      name: fixFileNameEncoding(doc.name),
    }));

    // Deduplicate by (folderId, fileName): keep latest updatedAt so the same file never appears twice (e.g. from duplicate Folder paths or sync races)
    const seen = new Map<string, (typeof fixedDocuments)[0]>();
    for (const doc of fixedDocuments) {
      const key = `${doc.folderId}:${doc.fileName}`;
      const existing = seen.get(key);
      const docUpdatedAt = doc.updatedAt ?? new Date(0);
      const existingUpdatedAt = existing?.updatedAt ?? new Date(0);
      if (!existing || docUpdatedAt > existingUpdatedAt) {
        seen.set(key, doc);
      }
    }
    const deduped = Array.from(seen.values()).sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "")
    );

    return {
      data: deduped,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /** Options for access control: when provided, folder must belong to user's department unless userCanUploadToAnyFolder. */
  async upload(
    folderId: string,
    file: Express.Multer.File,
    userId: string,
    name?: string,
    fileName?: string,
    levelId?: string,
    options?: {
      userDepartmentIds?: string[];
      userCanUploadToAnyFolder?: boolean;
    }
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

    if (!levelId || levelId.trim() === "") {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.LEVEL_REQUIRED,
        "levelId is required"
      );
    }
    const level = await this.documentLevelService.findById(levelId);
    if (!level || !level.isActive) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.INVALID_LEVEL,
        "Invalid or inactive document level"
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

    if (
      options &&
      !options.userCanUploadToAnyFolder &&
      options.userDepartmentIds &&
      options.userDepartmentIds.length > 0
    ) {
      if (
        !folder.departmentId ||
        !options.userDepartmentIds.includes(folder.departmentId)
      ) {
        throw CustomException.forbidden(
          ErrorCodes.DOCUMENT.FOLDER_ACCESS_DENIED,
          "Folder is not in your department"
        );
      }
    }

    // Enforce upload only to Documents (ISO_documents) folder (defence in depth)
    const normalizedPath = (folder.path ?? "").toLowerCase();
    const isUnderIsoDocuments =
      normalizedPath.includes("/iso_documents") ||
      normalizedPath === "iso_documents";
    if (!isUnderIsoDocuments) {
      throw CustomException.forbidden(
        ErrorCodes.DOCUMENT.FOLDER_ACCESS_DENIED,
        "Upload only allowed to Documents (ISO_documents) folder"
      );
    }

    // Ưu tiên dùng fileName từ body (gửi riêng như text field, UTF-8 thô)
    // Fallback về file.originalname nếu không có (đã được fix bởi interceptor)
    // Điều này tránh vấn đề encoding khi Multer parse filename từ Content-Disposition header
    const sourceFileName = fileName || file.originalname;
    const normalizedFileName = sourceFileName.normalize("NFC");
    const fileType = path.extname(normalizedFileName).slice(1).toLowerCase();
    const documentName =
      name ||
      path
        .basename(normalizedFileName, path.extname(normalizedFileName))
        .normalize("NFC");
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
        levelId,
        preparerId: userId,
        receiptDate: now,
        // Deletion tracking fields
        uploadedBy: userId,
        uploadedAt: now,
        deletionExpiresAt,
      },
    });

    // Save file using version service (creates v1 and sets document.filePath to current path)
    await this.versionService.createVersion(
      document.id,
      file.buffer,
      userId,
      "Initial upload"
    );

    // Update file dates from current file (do not overwrite filePath: createVersion already set it to currentPath)
    const updated = await (this.prisma as PrismaClientLike).document.findUnique(
      {
        where: { id: document.id },
        select: { filePath: true },
      }
    );
    if (updated?.filePath) {
      try {
        const stats = await this.smbService.getFileStats(updated.filePath);
        await (this.prisma as PrismaClientLike).document.update({
          where: { id: document.id },
          data: {
            fileCreatedAt: stats.birthtime,
            fileModifiedAt: stats.mtime,
          },
        });
      } catch {
        // Stats unavailable; filePath already correct from createVersion
      }
    }

    return this.findById(document.id);
  }

  async updateFile(
    documentId: string,
    file: Express.Multer.File,
    userId: string,
    comment?: string
  ) {
    // Validate document exists (throws if not found)
    await this.findById(documentId);
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

  async rename(
    documentId: string,
    newName: string,
    newFileName: string,
    userId: string
  ) {
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

  /**
   * Update ISO metadata fields (level, preparer, reviewer, approver, dates).
   * Validates level and user IDs exist before updating.
   */
  async updateIsoMetadata(
    id: string,
    dto: UpdateIsoMetadataDto,
    userId: string
  ) {
    const document = await (
      this.prisma as PrismaClientLike
    ).document.findUnique({
      where: { id },
    });
    if (!document) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.NOT_FOUND,
        "Document not found"
      );
    }

    if (dto.levelId !== undefined) {
      const level = await this.documentLevelService.findById(dto.levelId);
      if (!level || !level.isActive) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.INVALID_LEVEL,
          "Invalid or inactive document level"
        );
      }
    }

    const userIds = [dto.preparerId, dto.reviewerId, dto.approverId].filter(
      (v): v is string => v != null && v !== ""
    );
    if (userIds.length > 0) {
      const users = await (this.prisma as PrismaClientLike).user.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      });
      const foundIds = new Set(users.map((u) => u.id));
      const missing = userIds.filter((uid) => !foundIds.has(uid));
      if (missing.length > 0) {
        throw CustomException.badRequest(
          ErrorCodes.USER.NOT_FOUND,
          `User(s) not found: ${missing.join(", ")}`
        );
      }
    }

    const data: Prisma.DocumentUpdateInput = {};
    if (dto.levelId !== undefined) {
      data.level = { connect: { id: dto.levelId } };
    }
    if (dto.preparerId !== undefined) {
      data.preparer =
        dto.preparerId != null && dto.preparerId !== ""
          ? { connect: { id: dto.preparerId } }
          : { disconnect: true };
    }
    if (dto.reviewerId !== undefined) {
      data.reviewer =
        dto.reviewerId != null && dto.reviewerId !== ""
          ? { connect: { id: dto.reviewerId } }
          : { disconnect: true };
    }
    if (dto.approverId !== undefined) {
      data.approver =
        dto.approverId != null && dto.approverId !== ""
          ? { connect: { id: dto.approverId } }
          : { disconnect: true };
    }
    if (dto.approvalDate !== undefined) {
      data.approvalDate =
        dto.approvalDate == null || dto.approvalDate === ""
          ? null
          : new Date(dto.approvalDate);
    }
    if (dto.receiptDate !== undefined) {
      data.receiptDate =
        dto.receiptDate == null || dto.receiptDate === ""
          ? null
          : new Date(dto.receiptDate);
    }

    if (Object.keys(data).length === 0) {
      return this.findById(id);
    }

    await (this.prisma as PrismaClientLike).document.update({
      where: { id },
      data,
    });

    try {
      await (this.prisma as PrismaClientLike).auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          resourceType: "Document",
          resourceId: id,
          details: {
            isoMetadataUpdate: true,
            fields: Object.keys(data),
          },
        },
      });
    } catch (error) {
      console.error(
        "Failed to create audit log for ISO metadata update:",
        error
      );
    }

    return this.findById(id);
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

    const documents = await (this.prisma as PrismaClientLike).document.findMany(
      {
        where,
        include: { folder: true },
        take: 50,
      }
    );

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
