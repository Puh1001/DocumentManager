import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { DocumentService } from "@/modules/storage/services/document.service";
import { FolderService } from "@/modules/storage/services/folder.service";
import { SmbService } from "@/modules/storage/services/smb.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { KpiStatus } from "@prisma/client";
import {
  UserDepartmentResolver,
  UserWithDepartments,
} from "./user-department.resolver";
import { Express } from "express";
import * as path from "path";

export interface KpiAttachmentListItem {
  id: string;
  documentId: string;
  fileName: string;
  uploadedBy: string;
  createdAt: Date;
  description?: string | null;
}

@Injectable()
export class KpiAttachmentService {
  private readonly logger = new Logger(KpiAttachmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
    private readonly folderService: FolderService,
    private readonly smbService: SmbService,
    private readonly userDepartmentResolver: UserDepartmentResolver
  ) {}

  async uploadAttachment(
    kpiRecordId: string,
    file: Express.Multer.File,
    folderId: string | undefined,
    description: string | undefined,
    user: UserWithDepartments
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

    // Find or create folder for department if folderId is not provided
    let targetFolderId = folderId;
    if (!targetFolderId) {
      targetFolderId = await this.findOrCreateDepartmentKpiFolder(
        record.departmentId
      );
      this.logger.log(
        `Auto-created KPI folder for department ${record.departmentId}: ${targetFolderId}`
      );
    }

    // Store file using existing document pipeline on SMB-backed storage
    const document = await this.documentService.upload(
      targetFolderId,
      file,
      user.userId,
      record.title
    );

    // Use transaction for atomic operations: attachment creation + audit log + status update
    const attachment = await (this.prisma as PrismaClientLike).$transaction(
      async (tx) => {
        const createdAttachment = await tx.kpiAttachment.create({
          data: {
            kpiRecordId: record.id,
            documentId: document.id,
            description,
            createdById: user.userId,
          },
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
    user: UserWithDepartments
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

    const attachments = await (
      this.prisma as PrismaClientLike
    ).kpiAttachment.findMany({
      where: { kpiRecordId },
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
        fileName: a.document.fileName,
        uploadedBy: a.createdBy.fullName,
        createdAt: a.createdAt,
        description: a.description ?? undefined,
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

  async deleteAttachment(attachmentId: string, user: UserWithDepartments) {
    const attachment = await this.loadAttachmentWithRecord(attachmentId, user);

    // Check if user has delete permission or is the creator
    // Admin/Boss can delete any attachment
    // Regular users can only delete their own attachments
    if (
      !user.isAdmin &&
      !user.isBoss &&
      attachment.createdById !== user.userId
    ) {
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED,
        "You can only delete attachments you created"
      );
    }

    // Load document with folder information
    const document = await this.documentService.findById(attachment.documentId);
    const currentFolder = await this.folderService.findById(document.folderId);

    // Find or create "delete files" folder in the department folder
    const deleteFolder = await this.findOrCreateDeleteFolder(
      attachment.kpiRecord.departmentId,
      currentFolder
    );

    // Move file to delete folder
    // document.filePath points to: folder/current/filename.pdf
    const oldFilePath = document.filePath;
    const fileName = path.basename(oldFilePath);
    // New path in delete folder: department/delete files/filename.pdf
    const newFilePath = `${deleteFolder.path}/${fileName}`;

    try {
      // Move file physically from current folder to delete folder
      await this.smbService.rename(oldFilePath, newFilePath);

      // Update document to point to delete folder
      await (this.prisma as PrismaClientLike).document.update({
        where: { id: document.id },
        data: {
          folderId: deleteFolder.id,
          filePath: newFilePath,
          status: "DELETED",
        },
      });

      this.logger.log(
        `Moved KPI attachment file to delete folder: ${oldFilePath} -> ${newFilePath}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to move file to delete folder: ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      // If move fails, still mark document as deleted but don't update path
      await (this.prisma as PrismaClientLike).document.update({
        where: { id: document.id },
        data: {
          status: "DELETED",
        },
      });
    }

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
            movedToDeleteFolder: deleteFolder.path,
          },
        },
      });
    });

    return { success: true };
  }

  /**
   * Find or create a "delete files" folder in the department folder structure
   * The folder structure is: Department -> (kpi/maintenance/documents) -> files
   * When deleting, we move files to: Department -> delete files
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

    // Find or create "delete files" folder in department folder
    return this.findOrCreateFolderByName(departmentFolder.id, "delete files");
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
}
