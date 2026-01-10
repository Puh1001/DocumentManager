import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { DocumentService } from "@/modules/storage/services/document.service";
import { FolderService } from "@/modules/storage/services/folder.service";
import { SmbService } from "@/modules/storage/services/smb.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
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
    folderId: string,
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

    // Store file using existing document pipeline on SMB-backed storage
    const document = await this.documentService.upload(
      folderId,
      file,
      user.userId,
      record.title
    );

    const attachment = await (
      this.prisma as PrismaClientLike
    ).kpiAttachment.create({
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

    // Basic audit log entry – detailed structure can be extended later
    await this.prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "UPLOAD",
        resourceType: "KpiAttachment",
        resourceId: attachment.id,
        details: {
          kpiRecordId: record.id,
          documentId: document.id,
          fileName: document.fileName,
        },
      },
    });

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

    // Delete the attachment record
    await (this.prisma as PrismaClientLike).kpiAttachment.delete({
      where: { id: attachmentId },
    });

    // Log the deletion
    await this.prisma.auditLog.create({
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
   * Find or create a folder by name within a parent folder
   */
  private async findOrCreateFolderByName(parentId: string, folderName: string) {
    // Try to find existing folder
    const existing = await (this.prisma as PrismaClientLike).folder.findFirst({
      where: {
        parentId,
        name: folderName,
        deletedAt: null,
      },
    });

    if (existing) {
      return existing;
    }

    // Create new folder
    const parent = await this.folderService.findById(parentId);
    const folderPath = `${parent.path}/${folderName}`;

    // Create physical folder
    await this.smbService.createDirectory(folderPath);

    // Create in database
    return (this.prisma as PrismaClientLike).folder.create({
      data: {
        name: folderName,
        path: folderPath,
        parentId,
        departmentId: parent.departmentId,
      },
    });
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
