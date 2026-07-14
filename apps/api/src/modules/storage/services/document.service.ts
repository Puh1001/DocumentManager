import { Injectable, Logger } from "@nestjs/common";
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
import { isValidRevisionLabel } from "@iso-docs/shared";
import { DocumentLevelService } from "./document-level.service";
import { FolderService } from "./folder.service";
import { UpdateIsoMetadataDto } from "../dto/update-iso-metadata.dto";
import { StoragePathBuilder } from "../utils/storage-path.util";
import { getSafeExtension } from "@/common/utils/file.util";

export interface FindAllDocumentsFilters {
  status?: "ACTIVE" | "ARCHIVED" | "DELETED";
  departmentId?: string;
  /** When set (e.g. for non-admin users), restrict to documents in these departments. */
  departmentIdsForFilter?: string[];
  /** Filter by document level ID. */
  level?: string;
  /** Filter by level group: "13" = LEVEL1-3, "4" = LEVEL4. Overrides `level`. */
  levelGroup?: "13" | "4";
  page?: number;
  limit?: number;
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly smbService: SmbService,
    private readonly versionService: VersionService,
    private readonly documentLevelService: DocumentLevelService,
    private readonly folderService: FolderService,
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
        "Document not found",
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
      },
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

    // For deleted queries, relax folder restrictions so docs in Delete_files are found.
    // For non-deleted queries, exclude version/delete folders and scope to ISO_documents only.
    let folderWhere: Prisma.FolderWhereInput;
    if (filters?.status === "DELETED") {
      folderWhere = {
        path: { not: { contains: "/versions/" } },
      };
    } else {
      folderWhere = {
        AND: [
          { path: { not: { contains: "/versions/" } } },
          { path: { not: { contains: "\\versions\\" } } },
          { path: { not: { contains: "/Delete_files" } } },
          { path: { not: { contains: "\\Delete_files" } } },
          { path: { not: { contains: "/delete files" } } },
          { path: { not: { contains: "\\delete files" } } },
          { path: { not: { contains: "/Deleted files" } } },
          { path: { not: { contains: "\\Deleted files" } } },
          {
            OR: [
              { path: { contains: "/ISO_documents" } },
              { path: { contains: "\\ISO_documents" } },
              { path: { endsWith: "/ISO_documents" } },
              { path: { equals: "ISO_documents" } },
            ],
          },
        ],
      };
    }

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

    // Level group filter: "13" = LEVEL1-3, "4" = LEVEL4
    // Resolve level IDs by code pattern
    if (filters?.levelGroup) {
      const codes = filters.levelGroup === "13"
        ? ["LEVEL1", "LEVEL2", "LEVEL3"]
        : ["LEVEL4"];
      const levels = await (this.prisma as PrismaClientLike).documentLevel.findMany({
        where: { code: { in: codes } },
        select: { id: true },
      });
      const levelIds = levels.map(l => l.id);
      if (levelIds.length > 0) {
        where.levelId = { in: levelIds };
      } else {
        // No matching levels — force empty result
        where.levelId = { in: [] };
      }
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
      (a.name ?? "").localeCompare(b.name ?? ""),
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
  /** isoMetadata: optional preparer/reviewer/approver/approvalDate; when omitted, no auto-fill. */
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
    },
    isoMetadata?: {
      preparerName?: string;
      reviewerName?: string;
      approverName?: string;
      approvalDate?: string;
      receiptDate?: string;
      storageLocation?: string;
      documentNo?: string;
      revisionLabel?: string;
    },
  ) {
    if (!folderId) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.FOLDER_REQUIRED,
        "folderId is required",
      );
    }

    if (!file) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.FILE_REQUIRED,
        "file is required",
      );
    }

    if (!levelId || levelId.trim() === "") {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.LEVEL_REQUIRED,
        "levelId is required",
      );
    }
    const level = await this.documentLevelService.findById(levelId);
    if (!level || !level.isActive) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.INVALID_LEVEL,
        "Invalid or inactive document level",
      );
    }

    const folder = await (this.prisma as PrismaClientLike).folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.FOLDER_NOT_FOUND,
        "Folder not found",
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
          "Folder is not in your department",
        );
      }
    }

    // Enforce upload only to allowed sections: Documents (ISO_documents), KPI, or Maintenance
    const normalizedPath = (folder.path ?? "").toLowerCase();
    const isUnderIsoDocuments =
      normalizedPath.includes("/iso_documents") ||
      normalizedPath === "iso_documents";
    const isUnderKpi =
      normalizedPath.includes("/kpi") || normalizedPath === "kpi";
    const isUnderMaintenance =
      normalizedPath.includes("/maintenance") ||
      normalizedPath === "maintenance";
    if (!isUnderIsoDocuments && !isUnderKpi && !isUnderMaintenance) {
      throw CustomException.forbidden(
        ErrorCodes.DOCUMENT.FOLDER_ACCESS_DENIED,
        "Upload only allowed to Documents (ISO_documents), KPI, or Maintenance folder",
      );
    }

    // ISO upload: require user-provided ISO metadata (no auto-fill)
    if (isUnderIsoDocuments) {
      const preparerName = isoMetadata?.preparerName?.trim();
      const reviewerName = isoMetadata?.reviewerName?.trim();
      const approverName = isoMetadata?.approverName?.trim();
      const approvalDate = isoMetadata?.approvalDate?.trim();
      const receiptDateStr = isoMetadata?.receiptDate?.trim();
      const storageLocationStr = isoMetadata?.storageLocation?.trim();

      if (!preparerName) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.PREPARER_REQUIRED,
          "preparerName is required",
        );
      }
      if (!reviewerName) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.REVIEWER_REQUIRED,
          "reviewerName is required",
        );
      }
      if (!approverName) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.APPROVER_REQUIRED,
          "approverName is required",
        );
      }
      if (!approvalDate) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.APPROVAL_DATE_REQUIRED,
          "approvalDate is required",
        );
      }
      const parsed = new Date(approvalDate);
      if (Number.isNaN(parsed.getTime())) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.APPROVAL_DATE_REQUIRED,
          "approvalDate is invalid",
        );
      }
      if (!receiptDateStr) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.RECEIPT_DATE_REQUIRED,
          "receiptDate is required",
        );
      }
      const parsedReceiptDate = new Date(receiptDateStr);
      if (Number.isNaN(parsedReceiptDate.getTime())) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.RECEIPT_DATE_REQUIRED,
          "receiptDate is invalid",
        );
      }
      if (!storageLocationStr) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.STORAGE_LOCATION_REQUIRED,
          "storageLocation is required",
        );
      }

      // Validate documentNo format if provided
      const rawNo = isoMetadata?.documentNo?.trim() ?? "";
      let documentNo: string | null = null;
      if (rawNo) {
        const value = rawNo.toUpperCase();
        let valid = true;

        if (level.code === "LEVEL1") {
          valid = value === "BPVN-QESM-001";
        } else if (level.code === "LEVEL2") {
          const level2Regex = /^BPVN-(?:[A-Z0-9-]+-)?QEP-\d{3}$/;
          valid = level2Regex.test(value);
        } else if (level.code === "LEVEL3") {
          const level3Regex = /^BPVN-[A-Z0-9-]+-(SOP|SMP)-\d{3}$/;
          valid = level3Regex.test(value);
        } else if (level.code === "LEVEL4") {
          const level4Regex = /^BPVN-[A-Z0-9-]+-PR-\d{3}$/;
          valid = level4Regex.test(value);
        }

        if (!valid) {
          const levelLabel = level.code ? ` (selected: ${level.code})` : "";
          const hint =
            level.code === "LEVEL1"
              ? " Expected: BPVN-QESM-001"
              : level.code === "LEVEL2"
                ? " Expected: BPVN-(Dept)-QEP-001"
                : level.code === "LEVEL3"
                  ? " Expected: BPVN-(Dept)-SOP/SMP-001 (e.g. BPVN-WK-SOP-007)"
                  : level.code === "LEVEL4"
                    ? " Expected: BPVN-(Dept)-PR-001"
                    : " Check Level selection and format.";
          throw CustomException.badRequest(
            ErrorCodes.DOCUMENT.INVALID_DOCUMENT_NO,
            `Invalid documentNo for document level${levelLabel}.${hint}`,
          );
        }

        if (level.code === "LEVEL1") {
          const where: Record<string, unknown> = {
            documentNo: value,
            status: "ACTIVE", // Only check active documents, exclude deleted ones
          };
          const existing = await (
            this.prisma as PrismaClientLike
          ).document.findFirst({ where: where as Prisma.DocumentWhereInput });
          if (existing) {
            throw CustomException.badRequest(
              ErrorCodes.DOCUMENT.INVALID_DOCUMENT_NO,
              "documentNo must be unique for LEVEL1",
            );
          }
        }

        documentNo = value;
      }

      if (isoMetadata) {
        isoMetadata.documentNo = documentNo ?? undefined;
      }

      // Validate revisionLabel if provided (A/0..A/10, B/0..B/10, etc.)
      const rawRev = isoMetadata?.revisionLabel?.trim() ?? "";
      if (rawRev && !isValidRevisionLabel(rawRev)) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.INVALID_REVISION_LABEL,
          "Invalid revision label; use format Letter/0..10 (e.g. A/0, A/1, B/0)",
        );
      }
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

    // Optional ISO metadata: user-provided at upload; no auto-fill when omitted
    const preparerName = isoMetadata?.preparerName?.trim() || null;
    const reviewerName = isoMetadata?.reviewerName?.trim() || null;
    const approverName = isoMetadata?.approverName?.trim() || null;
    const approvalDate =
      isoMetadata?.approvalDate?.trim() != null &&
      isoMetadata.approvalDate.trim() !== ""
        ? new Date(isoMetadata.approvalDate)
        : null;
    const receiptDate =
      isoMetadata?.receiptDate?.trim() != null &&
      isoMetadata.receiptDate.trim() !== ""
        ? new Date(isoMetadata.receiptDate)
        : null;
    const storageLocation = isoMetadata?.storageLocation?.trim() || null;
    const documentNo =
      isoMetadata?.documentNo?.trim() != null &&
      isoMetadata.documentNo.trim() !== ""
        ? isoMetadata.documentNo.trim().toUpperCase()
        : null;
    const revisionLabel =
      isoMetadata?.revisionLabel?.trim() != null &&
      isoMetadata.revisionLabel.trim() !== ""
        ? isoMetadata.revisionLabel.trim().toUpperCase()
        : null;

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
        preparerName,
        reviewerName,
        approverName,
        approvalDate,
        // documentNo is part of the Prisma model but may not yet be present in generated types
        ...(documentNo ? ({ documentNo } as Record<string, unknown>) : {}),
        ...(revisionLabel
          ? ({ revisionLabel } as Record<string, unknown>)
          : {}),
        receiptDate,
        ...(storageLocation
          ? ({ storageLocation } as Record<string, unknown>)
          : {}),
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
      "Initial upload",
    );

    // Update file dates from current file (do not overwrite filePath: createVersion already set it to currentPath)
    const updated = await (this.prisma as PrismaClientLike).document.findUnique(
      {
        where: { id: document.id },
        select: { filePath: true },
      },
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
    comment?: string,
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
      comment,
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

  /**
   * Permanently delete a document's physical files from SMB storage.
   * Used by client file deletion to ensure both the current file and
   * all version files are removed from the shared folder.
   */
  async deletePhysicalFilesFromStorage(id: string): Promise<void> {
    const document = await (this.prisma as PrismaClientLike).document.findUnique(
      {
        where: { id },
        include: { versions: true },
      },
    );

    if (!document) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.NOT_FOUND,
        "Document not found",
      );
    }

    const paths = new Set<string>();
    if (document.filePath && document.filePath.trim() !== "") {
      paths.add(document.filePath);
    }
    for (const version of document.versions) {
      if (version.filePath && version.filePath.trim() !== "") {
        paths.add(version.filePath);
      }
    }

    let lastError: unknown | null = null;

    for (const relativePath of paths) {
      try {
        const exists = await this.smbService.exists(relativePath);
        if (!exists) {
          continue;
        }
        await this.smbService.deleteFile(relativePath);
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === "ENOENT") {
          // File was already removed; ignore
          continue;
        }
        lastError = error;
        this.logger.error(
          `Failed to delete file from storage for document ${id}: ${relativePath}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  async rename(
    documentId: string,
    newName: string,
    newFileName: string,
    userId: string,
  ) {
    const document = await this.findById(documentId);

    // Validate new filename has extension
    const ext = path.extname(newFileName);
    if (!ext) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.INVALID_FILENAME,
        "Filename must include extension",
      );
    }

    // Validate filename matches the original extension (to prevent changing file type)
    const originalExt = path.extname(document.fileName).toLowerCase();
    const newExt = ext.toLowerCase();
    if (originalExt !== newExt) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.INVALID_FILENAME,
        "Cannot change file extension",
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
   * Move document to a different department. DCC/admin only.
   * Target is always the department's ISO_documents folder.
   * Moves current file and all version files physically on SMB, updates DB.
   */
  async changeDepartment(
    documentId: string,
    targetDepartmentId: string,
    userId: string,
  ) {
    const document = await (
      this.prisma as PrismaClientLike
    ).document.findUnique({
      where: { id: documentId },
      include: {
        folder: { include: { department: true } },
        versions: true,
      },
    });

    if (!document) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.NOT_FOUND,
        "Document not found",
      );
    }

    const currentDepartmentId = document.folder?.departmentId;
    if (currentDepartmentId === targetDepartmentId) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.FOLDER_ACCESS_DENIED,
        "Document is already in the target department",
      );
    }

    const { documentsSectionRoot } =
      await this.folderService.ensureDepartmentFolderStructure(
        targetDepartmentId,
      );

    const targetFolderId = documentsSectionRoot;
    if (!targetFolderId) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.FOLDER_NOT_FOUND,
        "ISO_documents folder not found for target department",
      );
    }

    const targetFolder = await (
      this.prisma as PrismaClientLike
    ).folder.findUnique({
      where: { id: targetFolderId },
      include: { department: true },
    });

    if (!targetFolder) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.FOLDER_NOT_FOUND,
        "Target folder not found",
      );
    }

    const oldSectionRoot = StoragePathBuilder.deriveSectionRootFromFolderPath(
      document.folder.path,
    );
    const newSectionRoot = StoragePathBuilder.deriveSectionRootFromFolderPath(
      targetFolder.path,
    );

    const ext = getSafeExtension(document.fileName);
    const newCurrentPath = StoragePathBuilder.buildCurrentFilePath(
      newSectionRoot,
      document.id,
      ext,
    );

    // Ensure versions directory exists in target
    const versionsDir = `${newSectionRoot}/versions/${document.id}`;
    await this.smbService.createDirectory(versionsDir);

    // 1. Move current file
    const oldCurrentPath = document.filePath;
    if (oldCurrentPath) {
      const exists = await this.smbService.exists(oldCurrentPath);
      if (exists) {
        await this.smbService.rename(oldCurrentPath, newCurrentPath);
      }
    }

    // 2. Move version files
    const versionUpdates: Array<{ id: string; newPath: string }> = [];
    for (const ver of document.versions) {
      if (!ver.filePath) continue;
      const exists = await this.smbService.exists(ver.filePath);
      if (!exists) continue;
      const baseName = path.basename(ver.filePath);
      const newVersionPath = `${versionsDir}/${baseName}`;
      await this.smbService.rename(ver.filePath, newVersionPath);
      versionUpdates.push({ id: ver.id, newPath: newVersionPath });
    }

    // 3. Update DB in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: documentId },
        data: {
          folderId: targetFolderId,
          filePath: newCurrentPath,
        },
      });
      for (const { id, newPath } of versionUpdates) {
        await tx.documentVersion.update({
          where: { id },
          data: { filePath: newPath },
        });
      }
      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          resourceType: "Document",
          resourceId: documentId,
          details: {
            action: "changeDepartment",
            oldFolderId: document.folderId,
            newFolderId: targetFolderId,
            oldDepartmentName: document.folder.department?.name,
            newDepartmentName: targetFolder.department?.name,
          },
        },
      });
    });

    this.logger.log(
      `Document ${documentId} moved from ${oldSectionRoot} to ${newSectionRoot}`,
    );
    return this.findById(documentId);
  }

  /**
   * Update ISO metadata fields (level, preparer, reviewer, approver, dates).
   * Validates level exists before updating.
   */
  async updateIsoMetadata(
    id: string,
    dto: UpdateIsoMetadataDto,
    userId: string,
  ) {
    const document = await (
      this.prisma as PrismaClientLike
    ).document.findUnique({
      where: { id },
    });
    if (!document) {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.NOT_FOUND,
        "Document not found",
      );
    }

    let levelCode: string | undefined;
    const effectiveLevelId = dto.levelId ?? document.levelId;
    if (effectiveLevelId) {
      const level = await this.documentLevelService.findById(effectiveLevelId);
      if (!level || !level.isActive) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.INVALID_LEVEL,
          "Invalid or inactive document level",
        );
      }
      levelCode = level.code;
    }

    const data: Prisma.DocumentUpdateInput = {};
    if (dto.levelId !== undefined) {
      data.level = { connect: { id: dto.levelId } };
    }
    if (dto.preparerName !== undefined) {
      data.preparerName =
        dto.preparerName != null && dto.preparerName !== ""
          ? dto.preparerName.trim()
          : null;
    }
    if (dto.reviewerName !== undefined) {
      data.reviewerName =
        dto.reviewerName != null && dto.reviewerName !== ""
          ? dto.reviewerName.trim()
          : null;
    }
    if (dto.approverName !== undefined) {
      data.approverName =
        dto.approverName != null && dto.approverName !== ""
          ? dto.approverName.trim()
          : null;
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
    if (dto.storageLocation !== undefined) {
      data.storageLocation =
        dto.storageLocation != null && dto.storageLocation !== ""
          ? dto.storageLocation.trim()
          : null;
    }

    if (dto.documentNo !== undefined) {
      const raw = (dto.documentNo ?? "").trim();
      if (!raw) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.INVALID_DOCUMENT_NO,
          "documentNo is required for ISO documents",
        );
      }

      const value = raw.toUpperCase();
      let valid = true;

      if (levelCode === "LEVEL1") {
        // Only one document, fixed code
        valid = value === "BPVN-QESM-001";
      } else if (levelCode === "LEVEL2") {
        // BPVN-QEP-001 or BPVN-<DEPT>-QEP-001 (department segment optional; dept may contain hyphen e.g. V-TECH)
        const level2Regex = /^BPVN-(?:[A-Z0-9-]+-)?QEP-\d{3}$/;
        valid = level2Regex.test(value);
      } else if (levelCode === "LEVEL3") {
        // BPVN-<DEPT>-(SOP|SMP)-001 (dept may contain hyphen e.g. V-TECH)
        const level3Regex = /^BPVN-[A-Z0-9-]+-(SOP|SMP)-\d{3}$/;
        valid = level3Regex.test(value);
      } else if (levelCode === "LEVEL4") {
        // BPVN-<DEPT>-PR-001 (dept may contain hyphen e.g. V-TECH)
        const level4Regex = /^BPVN-[A-Z0-9-]+-PR-\d{3}$/;
        valid = level4Regex.test(value);
      }

      if (!valid) {
        const levelLabel = levelCode ? ` (selected: ${levelCode})` : "";
        const hint =
          levelCode === "LEVEL1"
            ? " Expected: BPVN-QESM-001"
            : levelCode === "LEVEL2"
              ? " Expected: BPVN-(Dept)-QEP-001"
              : levelCode === "LEVEL3"
                ? " Expected: BPVN-(Dept)-SOP/SMP-001 (e.g. BPVN-WK-SOP-007)"
                : levelCode === "LEVEL4"
                  ? " Expected: BPVN-(Dept)-PR-001"
                  : " Check Level selection and format.";
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.INVALID_DOCUMENT_NO,
          `Invalid documentNo for document level${levelLabel}.${hint}`,
        );
      }

      // Ensure uniqueness for LEVEL1 fixed code
      if (levelCode === "LEVEL1") {
        const where: Prisma.DocumentWhereInput = {
          id: { not: id },
        };
        // documentNo is part of the Prisma model but may not yet be in generated types
        (where as Record<string, unknown>).documentNo = value;

        const existing = await (
          this.prisma as PrismaClientLike
        ).document.findFirst({ where });
        if (existing) {
          throw CustomException.badRequest(
            ErrorCodes.DOCUMENT.INVALID_DOCUMENT_NO,
            "documentNo must be unique for LEVEL1",
          );
        }
      }

      (data as Record<string, unknown>).documentNo = value;
    }

    if (dto.revisionLabel !== undefined) {
      const raw =
        dto.revisionLabel == null || dto.revisionLabel === ""
          ? null
          : (dto.revisionLabel as string).trim();
      if (raw !== null && raw !== "" && !isValidRevisionLabel(raw)) {
        throw CustomException.badRequest(
          ErrorCodes.DOCUMENT.INVALID_REVISION_LABEL,
          "Invalid revision label; use format Letter/0..10 (e.g. A/0, A/1, B/0)",
        );
      }
      (data as Record<string, unknown>).revisionLabel = raw || null;
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
        error,
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
      },
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
