import { Injectable, Logger, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { DocumentService } from "@/modules/storage/services/document.service";
import { FolderService } from "@/modules/storage/services/folder.service";
import { SmbService } from "@/modules/storage/services/smb.service";
import {
  DocumentDeletionService,
  DeletionStatus,
} from "@/modules/storage/services/document-deletion.service";
import { DocumentLevelService } from "@/modules/storage/services/document-level.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { KpiStatus } from "@prisma/client";
import { fixFileNameEncoding } from "@/common/utils/encoding.util";
import {
  UserDepartmentResolver,
  UserWithDepartments,
} from "./user-department.resolver";
import { Express } from "express";
import * as path from "path";
import { OnEvent } from "@nestjs/event-emitter";

/** Used until Prisma client is regenerated (schema has month); safe at runtime after migration. */
type KpiAttachmentCreateWithMonth = {
  kpiRecordId: string;
  documentId: string;
  month?: number;
  description?: string | null;
  createdById: string;
};

/** Where filter for month: current month OR legacy NULL. */
type KpiAttachmentWhereMonth = {
  kpiRecordId: string;
  OR?: Array<{ month: number } | { month: null }>;
};

export interface KpiAttachmentListItem {
  id: string;
  documentId: string;
  fileName: string;
  uploadedBy: string;
  createdAt: Date;
  month?: number | null;
  description?: string | null;
  deletionExpiresAt?: Date | null;
}

@Injectable()
export class KpiAttachmentService {
  private readonly logger = new Logger(KpiAttachmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
    private readonly folderService: FolderService,
    private readonly smbService: SmbService,
    private readonly userDepartmentResolver: UserDepartmentResolver,
    private readonly deletionService: DocumentDeletionService,
    private readonly documentLevelService: DocumentLevelService
  ) {}

  async uploadAttachment(
    kpiRecordId: string,
    file: Express.Multer.File,
    folderId: string | undefined,
    description: string | undefined,
    user: UserWithDepartments,
    fileName?: string,
    month?: number
  ) {
    const record = await (this.prisma as PrismaClientLike).kpiRecord.findUnique(
      {
        where: { id: kpiRecordId },
        select: { id: true, departmentId: true, title: true },
      }
    );

    if (!record) {
      throw CustomException.notFound(
        ErrorCodes.KPI.RECORD_NOT_FOUND,
        "KPI record not found"
      );
    }

    this.checkDepartmentAccess(record.departmentId, user);

    if (!file) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.FILE_REQUIRED,
        "file is required"
      );
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf") {
      throw CustomException.badRequest(
        ErrorCodes.INVALID_INPUT,
        "Only PDF files are allowed for KPI attachments"
      );
    }

    // Always resolve canonical KPI section root for this department.
    // We intentionally ignore any non-canonical folderId to prevent legacy "/current/current" writes
    // and to enforce that KPI attachments always live under "{dept}/KPI".
    const folderStructure =
      await this.folderService.ensureDepartmentFolderStructure(
        record.departmentId
      );
    const canonicalKpiSectionRootId = folderStructure.kpiSectionRoot;
    if (!canonicalKpiSectionRootId) {
      throw CustomException.internalServerError(
        ErrorCodes.FOLDER.NOT_FOUND,
        "Failed to resolve KPI section root folder for department"
      );
    }

    const targetFolderId = canonicalKpiSectionRootId;
    if (folderId && folderId !== canonicalKpiSectionRootId) {
      // Extra context for investigation: log provided folder path vs canonical folder path.
      try {
        const providedFolder = await (
          this.prisma as PrismaClientLike
        ).folder.findUnique({
          where: { id: folderId },
          select: { id: true, path: true },
        });
        const canonicalFolder = await (
          this.prisma as PrismaClientLike
        ).folder.findUnique({
          where: { id: canonicalKpiSectionRootId },
          select: { id: true, path: true },
        });

        this.logger.warn(
          `KPI attachment upload: overriding non-canonical folderId`,
          {
            departmentId: record.departmentId,
            kpiRecordId: record.id,
            provided: providedFolder ?? { id: folderId, path: null },
            canonical: canonicalFolder ?? {
              id: canonicalKpiSectionRootId,
              path: null,
            },
          }
        );
      } catch (error) {
        this.logger.warn(
          `KPI attachment upload: overriding non-canonical folderId (failed to load folder paths)`,
          {
            departmentId: record.departmentId,
            kpiRecordId: record.id,
            folderId,
            canonicalKpiSectionRootId,
            error,
          }
        );
      }
    }

    // Get default document level (LEVEL1) for KPI uploads
    // KPI uploads default to document level 1 as per requirement
    const defaultLevel = await this.documentLevelService.findByCode("LEVEL1");
    if (!defaultLevel || !defaultLevel.isActive) {
      throw CustomException.internalServerError(
        ErrorCodes.DOCUMENT.INVALID_LEVEL,
        "Default document level (LEVEL1) not found or inactive"
      );
    }

    // Auto-rename: nếu file trùng tên đã tồn tại trong folder, append _YYYYMMDD
    // để tránh unique constraint violation (folder_id, file_name) ở DB
    const effectiveFileName = fileName || file.originalname;
    const normalizedEffectiveName = effectiveFileName.normalize("NFC");

    const existingDoc = await (this.prisma as PrismaClientLike).document.findFirst({
      where: {
        folderId: targetFolderId,
        fileName: normalizedEffectiveName,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    let finalFileName = fileName;
    if (existingDoc) {
      const ext = path.extname(normalizedEffectiveName);
      const baseName = path.basename(normalizedEffectiveName, ext);
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const dateSuffix = `${y}${m}${d}`;
      const newFileName = `${baseName}_${dateSuffix}${ext}`;
      finalFileName = newFileName;

      this.logger.warn(
        `KPI attachment filename conflict resolved: "${normalizedEffectiveName}" -> "${newFileName}" (folder: ${targetFolderId})`,
      );
    }

    // Store file using existing document pipeline on SMB-backed storage
    // Pass fileName từ body (UTF-8 thô) để tránh vấn đề encoding
    // Default to document level 1 for KPI uploads
    // Dùng finalFileName đã qua auto-rename nếu conflict
    const document = await this.documentService.upload(
      targetFolderId,
      file,
      user.userId,
      record.title,
      finalFileName,
      defaultLevel.id,
    );

    // Month: default to current month when omitted; validate 1-12 when provided
    const resolvedMonth =
      month !== undefined && month !== null
        ? month >= 1 && month <= 12
          ? month
          : new Date().getMonth() + 1
        : new Date().getMonth() + 1;

    // Use transaction for atomic operations: attachment creation + audit log + status update
    const attachment = await (this.prisma as PrismaClientLike).$transaction(
      async (tx) => {
        const createdAttachment = await tx.kpiAttachment.create({
          data: {
            kpiRecordId: record.id,
            documentId: document.id,
            month: resolvedMonth,
            description,
            createdById: user.userId,
          } as KpiAttachmentCreateWithMonth & Record<string, unknown>,
          include: {
            createdBy: true,
          },
        });

        // Audit log within transaction
        await tx.auditLog.create({
          data: {
            userId: user.userId,
            action: "UPLOAD",
            resourceType: "KpiAttachment",
            resourceId: createdAttachment.id,
            details: {
              kpiRecordId: record.id,
              documentId: document.id,
              fileName: document.fileName,
            },
          },
        });

        // Auto-update KPI status to COMPLETED (atomic with attachment)
        await tx.kpiRecord.update({
          where: { id: record.id },
          data: { status: KpiStatus.COMPLETED },
        });

        this.logger.log(
          `Auto-updated KPI record ${record.id} status to COMPLETED after attachment upload`
        );

        return createdAttachment;
      }
    );

    return attachment;
  }

  async listAttachments(
    kpiRecordId: string,
    user: UserWithDepartments,
    month?: number
  ): Promise<KpiAttachmentListItem[]> {
    const record = await (this.prisma as PrismaClientLike).kpiRecord.findUnique(
      {
        where: { id: kpiRecordId },
        select: { id: true, departmentId: true },
      }
    );

    if (!record) {
      throw CustomException.notFound(
        ErrorCodes.KPI.RECORD_NOT_FOUND,
        "KPI record not found"
      );
    }

    this.checkDepartmentAccess(record.departmentId, user);

    // Filter by month 1-12: return attachments for that month OR legacy (month IS NULL)
    const monthFilter =
      month !== undefined && !Number.isNaN(month) && month >= 1 && month <= 12
        ? { OR: [{ month }, { month: null }] }
        : undefined;

    const whereClause: KpiAttachmentWhereMonth = {
      kpiRecordId,
      ...(monthFilter ? monthFilter : {}),
    };

    const attachments = await (
      this.prisma as PrismaClientLike
    ).kpiAttachment.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- month filter; Prisma client regenerated after migration includes month
      where: whereClause as any,
      include: {
        document: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return attachments.map(
      (a): KpiAttachmentListItem => ({
        id: a.id,
        documentId: a.documentId,
        fileName: fixFileNameEncoding(
          (a as { document: { fileName: string } }).document.fileName
        ),
        uploadedBy: (a as { createdBy: { fullName: string } }).createdBy
          .fullName,
        createdAt: a.createdAt,
        month: (a as { month?: number | null }).month ?? null,
        description: a.description ?? undefined,
        deletionExpiresAt:
          (a as { document: { deletionExpiresAt: Date | null } }).document
            .deletionExpiresAt ?? null,
      })
    );
  }

  async getStream(attachmentId: string, user: UserWithDepartments) {
    const attachment = await this.loadAttachmentWithRecord(attachmentId, user);
    await this.prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "VIEW",
        resourceType: "KpiAttachment",
        resourceId: attachment.id,
        details: {
          kpiRecordId: attachment.kpiRecordId,
          documentId: attachment.documentId,
        },
      },
    });

    return this.documentService.getStream(attachment.documentId);
  }

  async download(attachmentId: string, user: UserWithDepartments) {
    const attachment = await this.loadAttachmentWithRecord(attachmentId, user);
    const result = await this.documentService.download(attachment.documentId);

    await this.prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "DOWNLOAD",
        resourceType: "KpiAttachment",
        resourceId: attachment.id,
        details: {
          kpiRecordId: attachment.kpiRecordId,
          documentId: attachment.documentId,
          fileName: result.fileName,
        },
      },
    });

    return result;
  }

  /**
   * Get deletion status for a KPI attachment
   * Uses DocumentDeletionService to check 72-hour rule and permissions
   */
  async getDeletionStatus(
    attachmentId: string,
    user: UserWithDepartments
  ): Promise<DeletionStatus> {
    const attachment = await this.loadAttachmentWithRecord(attachmentId, user);

    // Use DocumentDeletionService to check deletion status
    return this.deletionService.checkDeletionStatus(
      attachment.documentId,
      user.userId
    );
  }

  /**
   * Submit deletion request for a KPI attachment
   * Uses DocumentDeletionService to create deletion request
   */
  async submitDeletionRequest(
    attachmentId: string,
    user: UserWithDepartments,
    reason: string,
    replacementFileId?: string
  ) {
    const attachment = await this.loadAttachmentWithRecord(attachmentId, user);

    return this.deletionService.submitDeletionRequest(
      attachment.documentId,
      user.userId,
      reason,
      replacementFileId
    );
  }

  /**
   * Get deletion request for a KPI attachment
   * Uses DocumentDeletionService to get request by documentId
   */
  async getDeletionRequest(attachmentId: string, user: UserWithDepartments) {
    const attachment = await this.loadAttachmentWithRecord(attachmentId, user);

    return this.deletionService.getRequestByDocumentId(
      attachment.documentId,
      user.userId
    );
  }

  async renameAttachment(
    attachmentId: string,
    newName: string,
    newFileName: string,
    user: UserWithDepartments
  ) {
    const attachment = await this.loadAttachmentWithRecord(attachmentId, user);

    // Get current document to get old filename for audit log
    const currentDocument = await this.documentService.findById(
      attachment.documentId
    );

    // Use DocumentService to rename the underlying document
    const updatedDocument = await this.documentService.rename(
      attachment.documentId,
      newName,
      newFileName,
      user.userId
    );

    // Create audit log for KPI attachment rename
    try {
      await (this.prisma as PrismaClientLike).auditLog.create({
        data: {
          userId: user.userId,
          action: "UPDATE",
          resourceType: "KpiAttachment",
          resourceId: attachmentId,
          details: {
            documentId: attachment.documentId,
            oldFileName: currentDocument.fileName,
            newFileName: updatedDocument.fileName,
            action: "rename",
          },
        },
      });
    } catch (error) {
      // Don't fail if audit log fails
      this.logger.warn(
        `Failed to create audit log for KPI attachment rename: ${error}`
      );
    }

    return {
      id: attachment.id,
      documentId: attachment.documentId,
      fileName: updatedDocument.fileName,
      name: updatedDocument.name,
    };
  }

  async deleteAttachment(attachmentId: string, user: UserWithDepartments) {
    const attachment = await this.loadAttachmentWithRecord(attachmentId, user);

    // Check deletion status using DocumentDeletionService (enforces 72-hour rule)
    const status = await this.deletionService.checkDeletionStatus(
      attachment.documentId,
      user.userId
    );

    if (!status.canDelete) {
      if (status.isExpired) {
        this.logger.warn(
          `Deletion blocked: KPI attachment ${attachmentId} expired for user ${user.userId}`
        );
        throw new ForbiddenException(
          "Cannot delete: 72-hour window expired. Please submit a deletion request to DCC."
        );
      }
      this.logger.warn(
        `Deletion blocked: User ${user.userId} lacks permission for KPI attachment ${attachmentId}`
      );
      throw new ForbiddenException(
        "You do not have permission to delete this attachment"
      );
    }

    // Use DocumentDeletionService for self-deletion (handles file deletion)
    await this.deletionService.selfDelete(attachment.documentId, user.userId);

    this.logger.log(
      `KPI attachment ${attachmentId} document deleted, removing attachment record`
    );

    // Use transaction for atomic operations: delete attachment + status revert + audit log
    await (this.prisma as PrismaClientLike).$transaction(async (tx) => {
      // Delete the attachment record
      await tx.kpiAttachment.delete({
        where: { id: attachmentId },
      });

      // Check remaining attachments for this KPI record
      const remainingCount = await tx.kpiAttachment.count({
        where: { kpiRecordId: attachment.kpiRecordId },
      });

      // If no attachments remain and status is COMPLETED, revert to PENDING
      if (remainingCount === 0) {
        const kpiRecord = await tx.kpiRecord.findUnique({
          where: { id: attachment.kpiRecordId },
          select: { status: true },
        });

        if (kpiRecord?.status === KpiStatus.COMPLETED) {
          await tx.kpiRecord.update({
            where: { id: attachment.kpiRecordId },
            data: { status: KpiStatus.PENDING },
          });

          this.logger.log(
            `Auto-reverted KPI record ${attachment.kpiRecordId} status to PENDING after deleting last attachment`
          );
        }
      }

      // Audit log within transaction
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "DELETE",
          resourceType: "KpiAttachment",
          resourceId: attachment.id,
          details: {
            kpiRecordId: attachment.kpiRecordId,
            documentId: attachment.documentId,
            deletionMethod: "self-deletion-within-72h",
          },
        },
      });
    });

    return { success: true };
  }

  /**
   * Find or create a "Deleted files" folder in the department folder structure
   * The folder structure is: Department -> (KPI/Documents/Maintenance) -> current/version
   * When deleting, we move files to: Department -> Deleted files
   */
  private async findOrCreateDeleteFolder(
    departmentId: string,
    currentFolder: {
      id: string;
      path: string;
      parentId: string | null;
      departmentId: string | null;
    }
  ) {
    // The current folder should be in kpi/maintenance/documents subfolder
    // We need to find the department root folder (parent of kpi/maintenance/documents)
    let departmentFolder = currentFolder;

    // Traverse up to find department root folder
    // Stop when we reach a folder with no parent (root) or when departmentId matches
    while (departmentFolder.parentId) {
      const parent = await (this.prisma as PrismaClientLike).folder.findUnique({
        where: { id: departmentFolder.parentId },
        select: {
          id: true,
          path: true,
          parentId: true,
          departmentId: true,
          deletedAt: true,
        },
      });

      if (!parent || parent.deletedAt) {
        break;
      }

      // If parent has the matching departmentId and no parent, it's the department root
      if (parent.departmentId === departmentId && !parent.parentId) {
        departmentFolder = parent;
        break;
      }

      departmentFolder = parent;
    }

    // Verify we found the correct department folder
    if (departmentFolder.departmentId !== departmentId) {
      // Fallback: find department folder by departmentId
      const deptFolder = await (
        this.prisma as PrismaClientLike
      ).folder.findFirst({
        where: {
          departmentId,
          parentId: null,
          deletedAt: null,
        },
      });

      if (!deptFolder) {
        throw CustomException.notFound(
          ErrorCodes.FOLDER.NOT_FOUND,
          "Department folder not found"
        );
      }
      departmentFolder = deptFolder;
    }

    // Find or create "Deleted files" folder in department folder
    return this.findOrCreateFolderByName(departmentFolder.id, "Deleted files");
  }

  /**
   * Find or create department KPI folder structure: Department -> KPI -> current
   * Returns the "current" folder ID where KPI attachments should be stored
   */
  private async findOrCreateDepartmentKpiFolder(
    departmentId: string
  ): Promise<string> {
    // Step 1: Get department info first
    const department = await (
      this.prisma as PrismaClientLike
    ).department.findUnique({
      where: { id: departmentId },
      select: { id: true, code: true, nameVi: true },
    });

    if (!department) {
      throw CustomException.notFound(
        ErrorCodes.DEPARTMENT.NOT_FOUND,
        "Department not found"
      );
    }

    // Step 2: Find or create department root folder by path (path is unique)
    const folderPath = department.code;

    // Try to find by path first (more reliable than departmentId)
    let departmentFolder = await (
      this.prisma as PrismaClientLike
    ).folder.findUnique({
      where: { path: folderPath },
    });

    if (!departmentFolder) {
      // Folder doesn't exist - create it
      await this.smbService.createDirectory(folderPath);

      try {
        departmentFolder = await (
          this.prisma as PrismaClientLike
        ).folder.create({
          data: {
            name: department.nameVi || department.code,
            path: folderPath,
            parentId: null,
            departmentId: department.id,
          },
        });

        this.logger.log(`Created department root folder: ${folderPath}`);
      } catch (error: unknown) {
        // Handle race condition: folder might have been created by another request
        // Check if it's a Prisma unique constraint error (P2002)
        const isUniqueConstraintError =
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2002";

        if (isUniqueConstraintError) {
          this.logger.warn(
            `Folder ${folderPath} already exists (race condition), fetching existing folder`
          );
          // Fetch the existing folder
          departmentFolder = await (
            this.prisma as PrismaClientLike
          ).folder.findUnique({
            where: { path: folderPath },
          });
          if (!departmentFolder) {
            throw CustomException.notFound(
              ErrorCodes.FOLDER.NOT_FOUND,
              `Failed to create or find folder: ${folderPath}`
            );
          }
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    } else {
      // Folder exists - check if needs update
      if (!departmentFolder.departmentId || departmentFolder.deletedAt) {
        // Folder exists but departmentId not set or was deleted - update it
        await (this.prisma as PrismaClientLike).folder.update({
          where: { id: departmentFolder.id },
          data: {
            departmentId: department.id,
            deletedAt: null, // Restore if deleted
          },
        });
        this.logger.log(
          `Updated department folder: ${folderPath} with departmentId: ${department.id}`
        );
        // Reload folder to get updated data
        const updatedFolder = await (
          this.prisma as PrismaClientLike
        ).folder.findUnique({
          where: { path: folderPath },
        });
        if (updatedFolder) {
          departmentFolder = updatedFolder;
        }
      }
    }

    // Ensure departmentFolder is not null (should never happen, but TypeScript needs this)
    if (!departmentFolder) {
      throw CustomException.notFound(
        ErrorCodes.FOLDER.NOT_FOUND,
        `Failed to find or create department folder: ${folderPath}`
      );
    }

    // Step 2: Find or create "KPI" subfolder
    const kpiFolder = await this.findOrCreateFolderByName(
      departmentFolder.id,
      "KPI"
    );

    // Step 3: Find or create "current" subfolder in KPI folder (if it exists in structure)
    // Check if "current" subfolder exists, if not, use KPI folder directly
    let targetFolder = kpiFolder;
    try {
      const currentFolder = await this.findOrCreateFolderByName(
        kpiFolder.id,
        "current"
      );
      targetFolder = currentFolder;
    } catch (error) {
      // If "current" folder creation fails, use KPI folder directly
      this.logger.warn(
        `Could not create "current" subfolder in KPI folder, using KPI folder directly: ${error}`
      );
    }

    return targetFolder.id;
  }

  /**
   * Find or create a folder by name within a parent folder
   */
  private async findOrCreateFolderByName(parentId: string, folderName: string) {
    // Get parent folder to build path
    const parent = await this.folderService.findById(parentId);
    const folderPath = `${parent.path}/${folderName}`;

    // Try to find existing folder by path (more reliable than name+parentId)
    const existing = await (this.prisma as PrismaClientLike).folder.findUnique({
      where: { path: folderPath },
    });

    if (existing) {
      // Folder exists - restore if deleted, update parentId/departmentId if needed
      if (existing.deletedAt || existing.parentId !== parentId) {
        await (this.prisma as PrismaClientLike).folder.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            parentId,
            departmentId: parent.departmentId,
          },
        });
        // Reload to get updated data
        return (this.prisma as PrismaClientLike).folder.findUnique({
          where: { path: folderPath },
        }) as Promise<typeof existing>;
      }
      return existing;
    }

    // Create new folder
    // Create physical folder
    await this.smbService.createDirectory(folderPath);

    // Create in database
    try {
      return await (this.prisma as PrismaClientLike).folder.create({
        data: {
          name: folderName,
          path: folderPath,
          parentId,
          departmentId: parent.departmentId,
        },
      });
    } catch (error: unknown) {
      // Handle race condition: folder might have been created by another request
      const isUniqueConstraintError =
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002";

      if (isUniqueConstraintError) {
        this.logger.warn(
          `Folder ${folderPath} already exists (race condition), fetching existing folder`
        );
        // Fetch the existing folder
        const existingFolder = await (
          this.prisma as PrismaClientLike
        ).folder.findUnique({
          where: { path: folderPath },
        });
        if (existingFolder) {
          return existingFolder;
        }
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Delete all attachments for a KPI record scoped to one calendar month.
   * Legacy attachments (month IS NULL) are not removed — they apply to every month view.
   */
  async deleteAttachmentsForRecordMonth(
    kpiRecordId: string,
    month: number,
    user: UserWithDepartments
  ): Promise<{
    deletedCount: number;
    failed: Array<{ attachmentId: string; reason: string }>;
  }> {
    const record = await (this.prisma as PrismaClientLike).kpiRecord.findUnique(
      {
        where: { id: kpiRecordId },
        select: { id: true, departmentId: true },
      }
    );

    if (!record) {
      throw CustomException.notFound(
        ErrorCodes.KPI.RECORD_NOT_FOUND,
        "KPI record not found"
      );
    }

    this.checkDepartmentAccess(record.departmentId, user);

    if (user.isKpiViewerAll) {
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED,
        "kpi_viewer_all role is read-only. Cannot delete KPI attachments."
      );
    }

    const attachments = await (
      this.prisma as PrismaClientLike
    ).kpiAttachment.findMany({
      where: { kpiRecordId, month },
      select: { id: true },
    });

    let deletedCount = 0;
    const failed: Array<{ attachmentId: string; reason: string }> = [];

    for (const { id } of attachments) {
      try {
        await this.deleteAttachment(id, user);
        deletedCount += 1;
      } catch (error: unknown) {
        const reason =
          error instanceof Error ? error.message : "Delete failed";
        failed.push({ attachmentId: id, reason });
        this.logger.warn(
          `Failed to delete KPI attachment ${id} for record ${kpiRecordId} month ${month}`,
          { reason }
        );
      }
    }

    return { deletedCount, failed };
  }

  private async loadAttachmentWithRecord(
    attachmentId: string,
    user: UserWithDepartments
  ) {
    const attachment = await (
      this.prisma as PrismaClientLike
    ).kpiAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        kpiRecord: {
          select: {
            departmentId: true,
          },
        },
      },
    });

    if (!attachment) {
      throw CustomException.notFound(
        ErrorCodes.NOT_FOUND,
        "KPI attachment not found"
      );
    }

    this.checkDepartmentAccess(attachment.kpiRecord.departmentId, user);

    return attachment;
  }

  private checkDepartmentAccess(
    recordDepartmentId: string,
    user: UserWithDepartments
  ): void {
    // Admin/Boss/KpiViewerAll: Full access (read-only for kpi_viewer_all)
    if (user.isAdmin || user.isBoss || user.isKpiViewerAll) {
      return;
    }

    if (!user.departmentIds || user.departmentIds.length === 0) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} attempted to access KPI attachment without departments`,
        { userId: user.userId, recordDepartmentId }
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED_NO_DEPARTMENT,
        "User must belong to a department to access KPI attachments"
      );
    }

    if (!user.departmentIds.includes(recordDepartmentId)) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} attempted to access KPI attachment from non-assigned department`,
        {
          userId: user.userId,
          userDepartmentIds: user.departmentIds,
          recordDepartmentId,
        }
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED_DIFFERENT_DEPARTMENT,
        "Access denied: KPI attachment belongs to a department you're not assigned to"
      );
    }
  }

  @OnEvent("document.deleted")
  async handleDocumentDeletedEvent(payload: {
    documentId: string;
    userId: string;
    deletionMethod: string;
  }) {
    if (payload.deletionMethod !== "dcc-approved") return;

    // Check if this document is a KPI attachment
    const attachment = await (
      this.prisma as PrismaClientLike
    ).kpiAttachment.findFirst({
      where: { documentId: payload.documentId },
    });

    if (!attachment) return;

    this.logger.log(
      `Handling DCC approved deletion for KPI attachment ${attachment.id}`
    );

    // Use transaction for atomic operations: delete attachment + status revert + audit log
    await (this.prisma as PrismaClientLike).$transaction(async (tx) => {
      // Delete the attachment record
      await tx.kpiAttachment.delete({
        where: { id: attachment.id },
      });

      // Check remaining attachments for this KPI record
      const remainingCount = await tx.kpiAttachment.count({
        where: { kpiRecordId: attachment.kpiRecordId },
      });

      // If no attachments remain and status is COMPLETED, revert to PENDING
      if (remainingCount === 0) {
        const kpiRecord = await tx.kpiRecord.findUnique({
          where: { id: attachment.kpiRecordId },
          select: { status: true },
        });

        if (kpiRecord?.status === KpiStatus.COMPLETED) {
          await tx.kpiRecord.update({
            where: { id: attachment.kpiRecordId },
            data: { status: KpiStatus.PENDING },
          });

          this.logger.log(
            `Auto-reverted KPI record ${attachment.kpiRecordId} status to PENDING after DCC approved deletion`
          );
        }
      }

      // Audit log within transaction
      await tx.auditLog.create({
        data: {
          userId: payload.userId,
          action: "DELETE",
          resourceType: "KpiAttachment",
          resourceId: attachment.id,
          details: {
            kpiRecordId: attachment.kpiRecordId,
            documentId: attachment.documentId,
            deletionMethod: payload.deletionMethod,
          },
        },
      });
    });
  }
}
