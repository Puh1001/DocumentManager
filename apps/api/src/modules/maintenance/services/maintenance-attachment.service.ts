import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { DocumentService } from "@/modules/storage/services/document.service";
import { FolderService } from "@/modules/storage/services/folder.service";
import {
  DocumentDeletionService,
  DeletionStatus,
} from "@/modules/storage/services/document-deletion.service";
import { DocumentLevelService } from "@/modules/storage/services/document-level.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { fixFileNameEncoding } from "@/common/utils/encoding.util";
import { Express } from "express";
import * as path from "path";

const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"];

interface UserDeptInfo {
  departmentIds: string[];
  isAdmin: boolean;
  isBoss: boolean;
}

export interface MaintenanceAttachmentListItem {
  id: string;
  documentId: string;
  fileName: string;
  uploadedBy: string;
  createdAt: Date;
  description?: string | null;
  deletionExpiresAt?: Date | null;
}

@Injectable()
export class MaintenanceAttachmentService {
  private readonly logger = new Logger(MaintenanceAttachmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
    private readonly folderService: FolderService,
    private readonly deletionService: DocumentDeletionService,
    private readonly documentLevelService: DocumentLevelService
  ) {}

  /**
   * Upload a file attachment for a maintenance notice.
   * Files are stored in the department's Maintenance folder on SMB.
   */
  async uploadAttachment(
    maintenanceNoticeId: string,
    file: Express.Multer.File,
    description: string | undefined,
    userId: string,
    fileName?: string
  ) {
    const notice = await (this.prisma as PrismaClientLike).maintenanceNotice.findUnique({
      where: { id: maintenanceNoticeId },
      select: { id: true, title: true, departmentId: true },
    });

    if (!notice) {
      throw CustomException.notFound(
        ErrorCodes.MAINTENANCE.NOT_FOUND,
        "Maintenance notice not found"
      );
    }

    if (!file) {
      throw CustomException.badRequest(
        ErrorCodes.DOCUMENT.FILE_REQUIRED,
        "file is required"
      );
    }

    // Validate file type: only PDF & images
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw CustomException.badRequest(
        ErrorCodes.INVALID_INPUT,
        `Only ${ALLOWED_EXTENSIONS.join(", ")} files are allowed for maintenance attachments`
      );
    }

    // Write ops require same-department access
    await this.checkWriteAccess(notice.departmentId, userId);

    // Resolve canonical Maintenance section root folder for this department
    const folderStructure =
      await this.folderService.ensureDepartmentFolderStructure(
        notice.departmentId ?? ""
      );
    const canonicalMaintenanceSectionRootId = folderStructure.maintenanceSectionRoot;
    if (!canonicalMaintenanceSectionRootId) {
      throw CustomException.internalServerError(
        ErrorCodes.FOLDER.NOT_FOUND,
        "Failed to resolve Maintenance section root folder for department"
      );
    }

    // Get default document level (LEVEL1)
    const defaultLevel = await this.documentLevelService.findByCode("LEVEL1");
    if (!defaultLevel || !defaultLevel.isActive) {
      throw CustomException.internalServerError(
        ErrorCodes.DOCUMENT.INVALID_LEVEL,
        "Default document level (LEVEL1) not found or inactive"
      );
    }

    // Store file using existing document pipeline on SMB-backed storage
    const document = await this.documentService.upload(
      canonicalMaintenanceSectionRootId,
      file,
      userId,
      notice.title,
      fileName,
      defaultLevel.id
    );

    // Create attachment record within a transaction
    const attachment = await (this.prisma as PrismaClientLike).$transaction(
      async (tx) => {
        const createdAttachment = await tx.maintenanceAttachment.create({
          data: {
            maintenanceNoticeId: notice.id,
            documentId: document.id,
            description,
            createdById: userId,
          },
          include: {
            createdBy: {
              select: { id: true, fullName: true },
            },
          },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: "UPLOAD",
            resourceType: "MaintenanceAttachment",
            resourceId: createdAttachment.id,
            details: {
              maintenanceNoticeId: notice.id,
              documentId: document.id,
              fileName: document.fileName,
            },
          },
        });

        return createdAttachment;
      }
    );

    return attachment;
  }

  /**
   * List all attachments for a maintenance notice.
   */
  async listAttachments(
    maintenanceNoticeId: string,
    userId: string
  ): Promise<MaintenanceAttachmentListItem[]> {
    const notice = await (this.prisma as PrismaClientLike).maintenanceNotice.findUnique({
      where: { id: maintenanceNoticeId },
      select: { id: true, departmentId: true },
    });

    if (!notice) {
      throw CustomException.notFound(
        ErrorCodes.MAINTENANCE.NOT_FOUND,
        "Maintenance notice not found"
      );
    }

    this.checkReadAccess();

    const attachments = await (
      this.prisma as PrismaClientLike
    ).maintenanceAttachment.findMany({
      where: { maintenanceNoticeId },
      include: {
        document: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return attachments.map(
      (a): MaintenanceAttachmentListItem => ({
        id: a.id,
        documentId: a.documentId,
        fileName: fixFileNameEncoding(
          (a as { document: { fileName: string } }).document.fileName
        ),
        uploadedBy: (a as { createdBy: { fullName: string } }).createdBy
          .fullName,
        createdAt: a.createdAt,
        description: a.description ?? null,
        deletionExpiresAt:
          (a as { document: { deletionExpiresAt: Date | null } }).document
            .deletionExpiresAt ?? null,
      })
    );
  }

  async getStream(attachmentId: string, userId: string) {
    const attachment = await this.loadAttachmentWithNotice(attachmentId, userId);

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: "VIEW",
        resourceType: "MaintenanceAttachment",
        resourceId: attachment.id,
        details: {
          maintenanceNoticeId: attachment.maintenanceNoticeId,
          documentId: attachment.documentId,
        },
      },
    });

    const doc = await this.documentService.findById(attachment.documentId);
    return { stream: await this.documentService.getStream(attachment.documentId), mimeType: doc.mimeType ?? "application/octet-stream" };
  }

  async download(attachmentId: string, userId: string) {
    const attachment = await this.loadAttachmentWithNotice(attachmentId, userId);
    const result = await this.documentService.download(attachment.documentId);

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: "DOWNLOAD",
        resourceType: "MaintenanceAttachment",
        resourceId: attachment.id,
        details: {
          maintenanceNoticeId: attachment.maintenanceNoticeId,
          documentId: attachment.documentId,
          fileName: result.fileName,
        },
      },
    });

    return result;
  }

  async getDeletionStatus(attachmentId: string, userId: string): Promise<DeletionStatus> {
    const attachment = await this.loadAttachmentWithNotice(attachmentId, userId);
    return this.deletionService.checkDeletionStatus(attachment.documentId, userId);
  }

  async submitDeletionRequest(
    attachmentId: string,
    userId: string,
    reason: string,
    replacementFileId?: string
  ) {
    const attachment = await this.loadAttachmentWithNotice(attachmentId, userId);
    return this.deletionService.submitDeletionRequest(
      attachment.documentId,
      userId,
      reason,
      replacementFileId
    );
  }

  async getDeletionRequest(attachmentId: string, userId: string) {
    const attachment = await this.loadAttachmentWithNotice(attachmentId, userId);
    return this.deletionService.getRequestByDocumentId(attachment.documentId, userId);
  }

  async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await this.loadAttachmentWithNotice(attachmentId, userId);
    await this.checkWriteAccess(attachment.maintenanceNotice.departmentId, userId);

    const status = await this.deletionService.checkDeletionStatus(
      attachment.documentId,
      userId
    );

    if (!status.canDelete) {
      throw CustomException.forbidden(
        ErrorCodes.DOCUMENT.ACCESS_DENIED,
        status.isExpired
          ? "Cannot delete: 72-hour window expired. Please submit a deletion request."
          : "You do not have permission to delete this attachment"
      );
    }

    await this.deletionService.selfDelete(attachment.documentId, userId);

    await (this.prisma as PrismaClientLike).$transaction(async (tx) => {
      await tx.maintenanceAttachment.delete({
        where: { id: attachmentId },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE",
          resourceType: "MaintenanceAttachment",
          resourceId: attachment.id,
          details: {
            maintenanceNoticeId: attachment.maintenanceNoticeId,
            documentId: attachment.documentId,
            deletionMethod: "self-deletion-within-72h",
          },
        },
      });
    });

    return { success: true };
  }

  /**
   * Resolve user department info from DB.
   */
  private async resolveUser(
    userId: string
  ): Promise<UserDeptInfo> {
    const user = await (this.prisma as PrismaClientLike).user.findUnique({
      where: { id: userId },
      select: {
        departments: {
          select: { departmentId: true },
        },
        roles: {
          select: {
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!user) {
      throw CustomException.notFound(
        ErrorCodes.USER.NOT_FOUND,
        "User not found"
      );
    }

    const roleNames = user.roles.map((r) => r.role.name);
    return {
      departmentIds: user.departments.map((d) => d.departmentId),
      isAdmin: roleNames.includes("admin"),
      isBoss: roleNames.includes("boss"),
    };
  }

  private async loadAttachmentWithNotice(
    attachmentId: string,
    userId: string
  ) {
    const attachment = await (
      this.prisma as PrismaClientLike
    ).maintenanceAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        maintenanceNotice: {
          select: { departmentId: true },
        },
      },
    });

    if (!attachment) {
      throw CustomException.notFound(
        ErrorCodes.NOT_FOUND,
        "Maintenance attachment not found"
      );
    }

    await this.checkReadAccess();

    return attachment;
  }

  private checkReadAccess(): void {
    // Read access: all authenticated users can view
    return;
  }

  private async checkWriteAccess(
    recordDepartmentId: string | null,
    userId: string
  ): Promise<void> {
    const userInfo = await this.resolveUser(userId);

    if (userInfo.isAdmin || userInfo.isBoss) {
      return;
    }

    if (!userInfo.departmentIds || userInfo.departmentIds.length === 0) {
      throw CustomException.forbidden(
        ErrorCodes.PERMISSION.NOT_FOUND,
        "User must belong to a department to modify maintenance attachments"
      );
    }

    if (!recordDepartmentId) {
      throw CustomException.forbidden(
        ErrorCodes.PERMISSION.NOT_FOUND,
        "Access denied: maintenance notice has no department"
      );
    }

    if (!userInfo.departmentIds.includes(recordDepartmentId)) {
      throw CustomException.forbidden(
        ErrorCodes.PERMISSION.INVALID_SUBJECT,
        "Access denied: maintenance notice belongs to a department you're not assigned to"
      );
    }
  }
}
