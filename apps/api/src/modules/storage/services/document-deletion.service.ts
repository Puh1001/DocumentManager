import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { DocumentService } from "./document.service";
import { FolderService } from "./folder.service";
import { SmbService } from "./smb.service";
import { UsersService } from "@/modules/users/users.service";
import { FolderSyncGateway } from "../gateways/folder-sync.gateway";
import { StoragePathBuilder } from "../utils/storage-path.util";
import { Folder } from "@prisma/client";
import * as path from "path";

// Type definitions for Prisma includes
// Note: UsersService.findById() transforms roles: user.roles.map(r => r.role)
// So roles is already Array<{ name: string, ... }>, not Array<{ role: { name } }>
type UserWithRelations = {
  roles: Array<{ name: string }>;
  departments: Array<{ departmentId: string }>;
};

type FolderWithDepartment = Folder & {
  departmentId?: string | null;
};

export interface DeletionStatus {
  canDelete: boolean;
  isExpired: boolean;
  remainingHours: number;
  requiresDCCApproval: boolean;
  hasActiveRequest: boolean;
  requestId?: string;
}

@Injectable()
export class DocumentDeletionService {
  private readonly logger = new Logger(DocumentDeletionService.name);
  private static readonly DELETION_WINDOW_HOURS = 72;
  private static readonly DELETION_WINDOW_MS =
    DocumentDeletionService.DELETION_WINDOW_HOURS * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
    private readonly folderService: FolderService,
    private readonly smbService: SmbService,
    private readonly usersService: UsersService,
    private readonly folderSyncGateway: FolderSyncGateway
  ) {}

  async checkDeletionStatus(
    documentId: string,
    userId: string
  ): Promise<DeletionStatus> {
    const document = await this.documentService.findById(documentId);
    const user = await this.usersService.findById(userId);

    // Check if user is DCC (can always delete)
    // Note: UsersService.findById() already transforms roles to Array<{ name: string }>
    const userWithRelations = user as unknown as UserWithRelations;
    const isDCC =
      userWithRelations.roles?.some((role) => role.name === "dcc") || false;
    if (isDCC) {
      return {
        canDelete: true,
        isExpired: false,
        remainingHours: Infinity,
        requiresDCCApproval: false,
        hasActiveRequest: false,
      };
    }

    const now = new Date();
    const expiresAt =
      document.deletionExpiresAt ||
      new Date(
        (document.uploadedAt || document.createdAt).getTime() +
          DocumentDeletionService.DELETION_WINDOW_MS
      );
    const isExpired = now >= expiresAt;

    // Debug logging for deletion status calculation
    if (!document.deletionExpiresAt) {
      this.logger.warn(
        `Document ${documentId} missing deletionExpiresAt. Using fallback: uploadedAt=${document.uploadedAt}, createdAt=${document.createdAt}, calculated expiresAt=${expiresAt}`
      );
    }

    // Check if user uploaded or same department
    const isUploader = document.uploadedBy === userId;
    const folderWithDept = document.folder as unknown as FolderWithDepartment;
    const folderDepartmentId = folderWithDept?.departmentId;
    const isSameDepartment = folderDepartmentId
      ? userWithRelations.departments?.some(
          (d) => d.departmentId === folderDepartmentId
        ) || false
      : false;

    const canSelfDelete = (isUploader || isSameDepartment) && !isExpired;

    // Check for active request (only PENDING requests are considered "active")
    const activeRequest = await (
      this.prisma as PrismaClientLike
    ).deletionRequest.findFirst({
      where: {
        documentId,
        status: "PENDING",
      },
    });

    return {
      canDelete: canSelfDelete,
      isExpired,
      remainingHours: this.calculateRemainingHours(expiresAt),
      requiresDCCApproval: isExpired,
      hasActiveRequest: !!activeRequest,
      requestId: activeRequest?.id,
    };
  }

  async selfDelete(documentId: string, userId: string): Promise<void> {
    this.logger.log(
      `User ${userId} attempting to delete document ${documentId}`
    );
    const status = await this.checkDeletionStatus(documentId, userId);

    if (!status.canDelete) {
      if (status.isExpired) {
        this.logger.warn(
          `Deletion blocked: Document ${documentId} expired for user ${userId}`
        );
        throw new ForbiddenException(
          "Cannot delete: 72-hour window expired. Please submit a deletion request to DCC."
        );
      }
      this.logger.warn(
        `Deletion blocked: User ${userId} lacks permission for document ${documentId}`
      );
      throw new ForbiddenException(
        "You do not have permission to delete this document"
      );
    }

    await this.executeDelete(
      documentId,
      userId,
      "Self-deletion within 72-hour window"
    );
    this.logger.log(
      `Document ${documentId} deleted successfully by user ${userId}`
    );
  }

  async submitDeletionRequest(
    documentId: string,
    userId: string,
    reason: string,
    replacementFileId?: string
  ) {
    this.logger.log(
      `User ${userId} submitting deletion request for document ${documentId}`
    );
    const status = await this.checkDeletionStatus(documentId, userId);

    if (!status.requiresDCCApproval) {
      throw new BadRequestException(
        "You can still delete this document directly. DCC approval only required after 72 hours."
      );
    }

    if (status.hasActiveRequest) {
      throw new BadRequestException(
        "A deletion request for this document already exists"
      );
    }

    // Verify replacement file exists if provided
    if (replacementFileId) {
      await this.documentService.findById(replacementFileId);
    }

    // Check if there's an existing request (could be REJECTED or APPROVED)
    // Since documentId is unique, there can only be one request per document
    const existingRequest = await (
      this.prisma as PrismaClientLike
    ).deletionRequest.findUnique({
      where: { documentId },
    });

    // If request exists and is REJECTED, update it to PENDING (resubmit)
    if (existingRequest && existingRequest.status === "REJECTED") {
      this.logger.log(
        `Resubmitting rejected deletion request ${existingRequest.id} for document ${documentId}`
      );
      const updatedRequest = await (
        this.prisma as PrismaClientLike
      ).deletionRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: "PENDING",
          reason,
          replacementFileId,
          requestedBy: userId,
          requestedAt: new Date(),
          reviewedBy: null,
          reviewedAt: null,
          reviewerComment: null,
        },
        include: {
          document: true,
          requester: true,
          replacementFile: true,
        },
      });

      this.logger.log(
        `Deletion request resubmitted: ${updatedRequest.id} for document ${documentId} by user ${userId}`
      );
      // TODO: Send notification to DCC users

      return updatedRequest;
    }

    // If request exists with other status (APPROVED), throw error
    if (existingRequest) {
      throw new BadRequestException(
        "A deletion request for this document already exists with status: " +
          existingRequest.status
      );
    }

    // No existing request, create new
    const request = await (
      this.prisma as PrismaClientLike
    ).deletionRequest.create({
      data: {
        documentId,
        requestedBy: userId,
        reason,
        replacementFileId,
        status: "PENDING",
      },
      include: {
        document: true,
        requester: true,
        replacementFile: true,
      },
    });

    this.logger.log(
      `Deletion request created: ${request.id} for document ${documentId} by user ${userId}`
    );
    // TODO: Send notification to DCC users

    return request;
  }

  async reviewRequest(
    requestId: string,
    userId: string,
    approve: boolean,
    comment?: string
  ) {
    this.logger.log(
      `DCC user ${userId} reviewing deletion request ${requestId}: ${approve ? "APPROVE" : "REJECT"}`
    );
    const user = await this.usersService.findById(userId);
    // Note: UsersService.findById() already transforms roles to Array<{ name: string }>
    const userWithRelations = user as unknown as UserWithRelations;
    const isDCC =
      userWithRelations.roles?.some((role) => role.name === "dcc") || false;

    if (!isDCC) {
      throw new ForbiddenException(
        "Only DCC members can review deletion requests"
      );
    }

    const request = await (
      this.prisma as PrismaClientLike
    ).deletionRequest.findUnique({
      where: { id: requestId },
      include: {
        document: true,
        replacementFile: true,
      },
    });

    if (!request) {
      throw new NotFoundException("Deletion request not found");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestException("This request has already been reviewed");
    }

    const updatedRequest = await (
      this.prisma as PrismaClientLike
    ).deletionRequest.update({
      where: { id: requestId },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewerComment: comment,
      },
      include: {
        document: true,
        requester: true,
        reviewer: true,
      },
    });

    if (approve) {
      this.logger.log(
        `Executing deletion for document ${request.documentId} after DCC approval`
      );

      // If there's a replacement file, replace the old file with it
      if (request.replacementFileId && request.replacementFile) {
        await this.replaceDocumentWithReplacement(
          request.documentId,
          request.replacementFileId,
          userId,
          `DCC approved deletion request with replacement: ${request.reason}`
        );
      } else {
        // No replacement file, just delete the old document
        await this.executeDelete(
          request.documentId,
          userId,
          `DCC approved deletion request: ${request.reason}`
        );
      }
      // document_deleted event is already broadcast by executeDelete/replaceDocumentWithReplacement
    } else {
      this.logger.log(
        `Deletion request ${requestId} rejected by DCC user ${userId}`
      );

      // If there's a replacement file, delete it since request was rejected
      if (request.replacementFileId && request.replacementFile) {
        this.logger.log(
          `Deleting replacement file ${request.replacementFileId} after rejection`
        );
        try {
          await this.executeDelete(
            request.replacementFileId,
            userId,
            `Replacement file deleted after DCC rejection of deletion request`
          );
        } catch (error) {
          // Log error but don't fail the rejection
          this.logger.error(
            `Failed to delete replacement file ${request.replacementFileId} after rejection`,
            error
          );
        }
      }

      // Broadcast event so frontend can update UI
      this.folderSyncGateway.broadcastSyncEvent({
        type: "deletion_request_rejected",
        documentId: request.documentId,
        data: { requestId: updatedRequest.id },
      });
    }

    // TODO: Send notification to requester

    return updatedRequest;
  }

  async listPendingRequests() {
    return (this.prisma as PrismaClientLike).deletionRequest.findMany({
      where: { status: "PENDING" },
      include: {
        document: {
          include: { folder: true },
        },
        requester: true,
        replacementFile: true,
      },
      orderBy: { requestedAt: "asc" },
    });
  }

  async getRequestById(requestId: string) {
    const request = await (
      this.prisma as PrismaClientLike
    ).deletionRequest.findUnique({
      where: { id: requestId },
      include: {
        document: {
          include: { folder: true },
        },
        requester: true,
        reviewer: true,
        replacementFile: true,
      },
    });

    if (!request) {
      throw new NotFoundException("Deletion request not found");
    }

    return request;
  }

  async getUserRequests(userId: string) {
    return (this.prisma as PrismaClientLike).deletionRequest.findMany({
      where: { requestedBy: userId },
      include: {
        document: {
          include: { folder: true },
        },
        reviewer: true,
        replacementFile: true,
      },
      orderBy: { requestedAt: "desc" },
    });
  }

  async getRequestByDocumentId(documentId: string, userId: string) {
    const user = await this.usersService.findById(userId);
    const userWithRelations = user as unknown as UserWithRelations;
    const isDCC =
      userWithRelations.roles?.some((role) => role.name === "dcc") || false;

    const request = await (
      this.prisma as PrismaClientLike
    ).deletionRequest.findFirst({
      where: { documentId },
      include: {
        reviewer: true,
        requester: true,
      },
      orderBy: { requestedAt: "desc" },
    });

    if (!request) {
      return null;
    }

    // Allow access if:
    // 1. User is DCC (can see any request)
    // 2. User is the requester (can see their own request)
    if (isDCC || request.requestedBy === userId) {
      return request;
    }

    // User is neither DCC nor requester - deny access
    throw new ForbiddenException(
      "You do not have permission to view this deletion request"
    );
  }

  private async replaceDocumentWithReplacement(
    oldDocumentId: string,
    replacementDocumentId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const oldDocument = await this.documentService.findById(oldDocumentId);
    const replacementDocument = await this.documentService.findById(
      replacementDocumentId
    );
    const currentFolder = await this.folderService.findById(
      oldDocument.folderId
    );

    // Find department ID
    const departmentId =
      currentFolder.departmentId ||
      (await this.findDepartmentIdForFolder(currentFolder));

    if (!departmentId) {
      throw new BadRequestException("Cannot determine department for document");
    }

    // Find or create "Delete_files" folder
    const deleteFolder = await this.findOrCreateDeleteFolder(departmentId);

    const oldFilePath = oldDocument.filePath;
    const replacementFilePath = replacementDocument.filePath;

    // Validate both files exist
    try {
      const oldFileStats = await this.smbService.getFileStats(oldFilePath);
      if (oldFileStats.isDirectory()) {
        throw new BadRequestException(
          `Cannot replace: old filePath points to a folder. Document ID: ${oldDocumentId}`
        );
      }
      const replacementFileStats =
        await this.smbService.getFileStats(replacementFilePath);
      if (replacementFileStats.isDirectory()) {
        throw new BadRequestException(
          `Cannot replace: replacement filePath points to a folder. Document ID: ${replacementDocumentId}`
        );
      }
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        throw new NotFoundException(
          `File not found. Old: ${oldFilePath}, Replacement: ${replacementFilePath}`
        );
      }
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw error;
    }

    // Extract physical file names
    const oldPhysicalFileName = path.basename(oldFilePath);

    // New path for old file (move to deleted folder)
    const deletedFilePath = path.join(deleteFolder.path, oldPhysicalFileName);

    // Replacement file will take the old file's location and name
    // We'll move it and rename it to match the old file's name
    const newFilePath = oldFilePath; // Same location and name as old file

    // Step 1: Move old file to deleted folder
    try {
      await this.smbService.rename(oldFilePath, deletedFilePath);
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "EPERM") {
        throw new ForbiddenException(
          `Permission denied: Cannot move old file to delete folder. Path: ${oldFilePath} -> ${deletedFilePath}`
        );
      }
      throw error;
    }

    // Step 2: Move replacement file to old file's location (rename to old file's name)
    try {
      await this.smbService.rename(replacementFilePath, newFilePath);
    } catch (error: unknown) {
      // If replacement move fails, try to revert old file move
      try {
        await this.smbService.rename(deletedFilePath, oldFilePath);
      } catch (revertError) {
        this.logger.error(
          `Failed to revert old file move after replacement move failed. Old file orphaned: ${deletedFilePath}`,
          revertError
        );
      }
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "EPERM") {
        throw new ForbiddenException(
          `Permission denied: Cannot move replacement file to old location. Path: ${replacementFilePath} -> ${newFilePath}`
        );
      }
      if (nodeError.code === "EEXIST") {
        // File already exists at new location (shouldn't happen, but handle it)
        throw new BadRequestException(
          `Cannot replace: File already exists at target location: ${newFilePath}`
        );
      }
      throw error;
    }

    // Step 3: Update database in transaction
    try {
      await this.prisma.$transaction(async (tx) => {
        // Update old document record with replacement file's metadata
        await (tx as PrismaClientLike).document.update({
          where: { id: oldDocumentId },
          data: {
            name: replacementDocument.name,
            fileName: replacementDocument.fileName,
            fileType: replacementDocument.fileType,
            mimeType: replacementDocument.mimeType,
            fileSize: replacementDocument.fileSize,
            filePath: newFilePath,
            checksum: replacementDocument.checksum,
            fileCreatedAt: replacementDocument.fileCreatedAt,
            fileModifiedAt: replacementDocument.fileModifiedAt,
            // Reset deletion tracking since this is now a new file
            uploadedBy: replacementDocument.uploadedBy,
            uploadedAt: replacementDocument.uploadedAt,
            deletionExpiresAt: replacementDocument.deletionExpiresAt,
          },
        });

        // Delete replacement document record (file has been moved, record no longer needed)
        await (tx as PrismaClientLike).document.update({
          where: { id: replacementDocumentId },
          data: {
            folderId: deleteFolder.id,
            filePath: deletedFilePath,
            status: "DELETED",
          },
        });

        // Create audit log for replacement
        await (tx as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "REPLACE",
            resourceType: "Document",
            resourceId: oldDocumentId,
            details: {
              reason,
              oldFilePath,
              newFilePath,
              replacementDocumentId,
              deletedFilePath,
            },
          },
        });
      });
    } catch (error) {
      // If DB transaction fails, attempt to revert file moves
      // This is best-effort recovery
      try {
        await this.smbService.rename(newFilePath, replacementFilePath);
        await this.smbService.rename(deletedFilePath, oldFilePath);
      } catch (revertError) {
        this.logger.error(
          `Failed to revert file moves after DB error. Files may be orphaned.`,
          revertError
        );
      }
      throw error;
    }

    this.logger.log(
      `Document replacement completed: Old document ${oldDocumentId} replaced with ${replacementDocumentId}. Old file moved to ${deletedFilePath}, replacement moved to ${newFilePath}`
    );

    // Broadcast sync event - document was updated (replaced)
    this.folderSyncGateway.broadcastSyncEvent({
      type: "document_updated",
      documentId: oldDocumentId,
      folderId: oldDocument.folderId,
      data: {
        replacementDocumentId,
        newFilePath,
        action: "replaced",
      },
    });
  }

  async restoreDocument(documentId: string, userId: string) {
    this.logger.log(`User ${userId} restoring document ${documentId}`);

    // Only DCC/admin can restore — verify via user's roles
    const user = await this.usersService.findById(userId);
    const userWithRelations = user as unknown as UserWithRelations;
    const isDCC = userWithRelations.roles?.some((r) => r.name === "dcc") || false;
    const isAdmin = userWithRelations.roles?.some((r) => r.name === "admin") || false;
    if (!isDCC && !isAdmin) {
      throw new ForbiddenException("Only DCC members or admins can restore documents");
    }

    const document = await this.documentService.findById(documentId);
    if (document.status !== "DELETED") {
      throw new BadRequestException("Only deleted documents can be restored");
    }

    // Get the last deletion audit log to find original folder ID and original path
    const lastDeleteLog = await (this.prisma as PrismaClientLike).auditLog.findFirst({
      where: { resourceId: documentId, action: "DELETE" },
      orderBy: { createdAt: "desc" },
    });

    let originalFolderId: string | null = null;
    let originalFilePath: string | null = null;

    if (lastDeleteLog?.details && typeof lastDeleteLog.details === "object") {
      const details = lastDeleteLog.details as Record<string, unknown>;
      originalFolderId = (details.originalFolderId as string) || null;
      originalFilePath = (details.originalPath as string) || null;
    }

    // Fallback: find original folder from document's current Delete_files folder path
    if (!originalFolderId) {
      // Current folder is {dept}/Delete_files — find ISO_documents sibling folder
      const currentFolder = await this.folderService.findById(document.folderId);
      const deptFolder = currentFolder.parentId
        ? await this.folderService.findById(currentFolder.parentId)
        : null;
      if (deptFolder) {
        const isoFolder = await (this.prisma as PrismaClientLike).folder.findFirst({
          where: { parentId: deptFolder.id, path: { contains: "/ISO_documents" } },
        });
        if (isoFolder && !isoFolder.deletedAt) {
          originalFolderId = isoFolder.id;
        }
      }
    }

    // Verify original folder exists
    let originalFolder = originalFolderId
      ? await (this.prisma as PrismaClientLike).folder.findUnique({
          where: { id: originalFolderId },
        })
      : null;
    if (!originalFolder || originalFolder.deletedAt) {
      throw new BadRequestException("Cannot restore: original folder not found. The folder may have been deleted.");
    }

    // Move file back from Delete_files to original path
    const currentFilePath = document.filePath;
    if (currentFilePath?.trim() && originalFilePath) {
      try {
        await this.smbService.rename(currentFilePath, originalFilePath);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown";
        this.logger.warn(`Failed to move file back to original location: ${msg}. Proceeding with DB update.`);
      }
    }

    // Update document record
    await (this.prisma as PrismaClientLike).$transaction(async (tx) => {
      await (tx as PrismaClientLike).document.update({
        where: { id: documentId },
        data: {
          status: "ACTIVE",
          folderId: originalFolderId!,
          filePath: originalFilePath || currentFilePath,
        },
      });

      await (tx as PrismaClientLike).auditLog.create({
        data: {
          userId,
          action: "RESTORE",
          resourceType: "Document",
          resourceId: documentId,
          details: {
            restoredFromFolder: document.folderId,
            restoredToFolder: originalFolderId,
            originalPath: originalFilePath,
            currentPath: currentFilePath,
          },
        },
      });
    });

    this.logger.log(`Document ${documentId} restored successfully by user ${userId}`);
    return this.documentService.findById(documentId);
  }

  private async executeDelete(
    documentId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const document = await this.documentService.findById(documentId);
    const currentFolder = await this.folderService.findById(document.folderId);

    // Find department ID
    const departmentId =
      currentFolder.departmentId ||
      (await this.findDepartmentIdForFolder(currentFolder));

    if (!departmentId) {
      throw new BadRequestException("Cannot determine department for document");
    }

    // Find or create "Delete_files" folder
    const deleteFolder = await this.findOrCreateDeleteFolder(departmentId);

    const oldFilePath = document.filePath;
    const norm = (p: string) => (p || "").replace(/\\/g, "/");

    // Canonical current file path (section root + documentId + ext) so we never leave it behind
    const sectionRoot = StoragePathBuilder.deriveSectionRootFromFolderPath(
      currentFolder.path
    );
    const ext =
      path.extname(document.fileName || "") ||
      path.extname(document.filePath || "") ||
      "";
    const currentPath =
      sectionRoot && ext
        ? StoragePathBuilder.buildCurrentFilePath(
            sectionRoot,
            documentId,
            ext.startsWith(".") ? ext : `.${ext}`
          )
        : "";

    let newFilePath: string | null = null;
    let movedCurrentFile = false;

    // 1) Move current file to Delete_files if it exists and is different from document.filePath (e.g. filePath pointed to version)
    if (currentPath && norm(currentPath) !== norm(oldFilePath || "")) {
      try {
        const exists = await this.smbService.exists(currentPath);
        if (exists) {
          const stats = await this.smbService.getFileStats(currentPath);
          if (!stats.isDirectory()) {
            const currentFileName = path.basename(currentPath);
            const currentFileDest = path.join(
              deleteFolder.path,
              currentFileName
            );
            await this.smbService.rename(currentPath, currentFileDest);
            movedCurrentFile = true;
            newFilePath = currentFileDest;
            this.logger.debug(
              `Moved current file to Delete_files: ${currentPath} -> ${currentFileDest}`
            );
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        this.logger.warn(
          `Failed to move current file to Delete_files (${currentPath}): ${msg}`
        );
      }
    }

    // 2) Move document.filePath to Delete_files if it exists (primary path in DB)
    if (oldFilePath?.trim()) {
      try {
        const fileStats = await this.smbService.getFileStats(oldFilePath);
        if (fileStats.isDirectory()) {
          throw new BadRequestException(
            `Cannot delete: filePath points to a folder instead of a file. ` +
              `Document may be corrupted. Document ID: ${documentId}, filePath: ${oldFilePath}`
          );
        }
        const physicalFileName = path.basename(oldFilePath);
        const destPath = path.join(deleteFolder.path, physicalFileName);
        try {
          await this.smbService.rename(oldFilePath, destPath);
          newFilePath = destPath;
        } catch (renameError: unknown) {
          const rn = renameError as NodeJS.ErrnoException;
          if (rn.code === "EPERM") {
            throw new ForbiddenException(
              `Permission denied: Cannot move file to delete folder. ` +
                `Check SMB share permissions for path: ${oldFilePath} -> ${destPath}`
            );
          }
          throw renameError;
        }
      } catch (error: unknown) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === "ENOENT") {
          if (movedCurrentFile && newFilePath) {
            // document.filePath missing but we moved current file; keep newFilePath from step 1
          } else {
            // File already missing on SMB (e.g. deleted externally). Allow DB-only update so user can clear the record.
            this.logger.warn(
              `File not found at path: ${oldFilePath}. Marking document ${documentId} as DELETED (file was already moved or deleted on storage).`
            );
            newFilePath = oldFilePath;
          }
        } else if (error instanceof BadRequestException) {
          throw error;
        } else {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          this.logger.warn(
            `Failed to move filePath to Delete_files: ${errorMessage}. Will attempt rename anyway.`
          );
          try {
            const destPath = path.join(
              deleteFolder.path,
              path.basename(oldFilePath)
            );
            await this.smbService.rename(oldFilePath, destPath);
            newFilePath = destPath;
          } catch (renameErr) {
            if (!movedCurrentFile) throw renameErr;
          }
        }
      }
    }

    if (!newFilePath) {
      throw new NotFoundException(
        `No file to move for document ${documentId}. filePath: ${oldFilePath}, currentPath: ${currentPath}`
      );
    }

    // Use transaction for atomic database operations
    try {
      await this.prisma.$transaction(async (tx) => {
        await (tx as PrismaClientLike).document.update({
          where: { id: documentId },
          data: {
            folderId: deleteFolder.id,
            filePath: newFilePath!,
            status: "DELETED",
          },
        });

        await (tx as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "DELETE",
            resourceType: "Document",
            resourceId: documentId,
            details: {
              reason,
              originalPath: oldFilePath,
              originalFolderId: currentFolder.id,
              newPath: newFilePath,
              movedCurrentFile,
            },
          },
        });
      });
    } catch (error) {
      // Best-effort revert: only if we actually moved a file (newFilePath !== oldFilePath)
      const actuallyMovedFile =
        newFilePath &&
        oldFilePath?.trim() &&
        norm(newFilePath) !== norm(oldFilePath);
      if (actuallyMovedFile) {
        try {
          await this.smbService.rename(newFilePath!, oldFilePath!);
        } catch (revertError) {
          this.logger.error(
            `Failed to revert file move after DB error. File orphaned: ${newFilePath}`,
            revertError
          );
        }
      }
      throw error;
    }
    this.logger.log(
      `Deletion completed: Document ${documentId} moved to ${newFilePath}`
    );
  }

  private async findOrCreateDeleteFolder(departmentId: string) {
    const department = await (
      this.prisma as PrismaClientLike
    ).department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new BadRequestException("Department not found");
    }

    const deleteFolderPath = `${department.code}/Delete_files`;

    let deleteFolder = await (
      this.prisma as PrismaClientLike
    ).folder.findUnique({
      where: { path: deleteFolderPath },
    });

    if (!deleteFolder) {
      // Create folder on SMB
      await this.smbService.createDirectory(deleteFolderPath);

      // Create database record (handle race condition)
      try {
        deleteFolder = await (this.prisma as PrismaClientLike).folder.create({
          data: {
            name: "Delete_files",
            path: deleteFolderPath,
            departmentId,
          },
        });
      } catch (error) {
        const e = error as any;
        if (e?.code === "P2002") {
          deleteFolder = await (
            this.prisma as PrismaClientLike
          ).folder.findUnique({
            where: { path: deleteFolderPath },
          });
        } else {
          throw error;
        }
      }
    }

    if (!deleteFolder) {
      throw new BadRequestException("Failed to create or find delete folder");
    }

    return deleteFolder;
  }

  private async findDepartmentIdForFolder(
    folder: FolderWithDepartment
  ): Promise<string | null> {
    if (folder.departmentId) return folder.departmentId;
    if (!folder.parentId) return null;

    const parent = await this.folderService.findById(folder.parentId);
    return this.findDepartmentIdForFolder(parent);
  }

  private calculateRemainingHours(expiresAt: Date): number {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / (60 * 60 * 1000)));
  }
}
