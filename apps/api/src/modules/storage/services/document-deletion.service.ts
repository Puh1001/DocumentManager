import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PrismaClientLike } from '@/common/types/prisma.types';
import { DocumentService } from './document.service';
import { FolderService } from './folder.service';
import { SmbService } from './smb.service';
import { UsersService } from '@/modules/users/users.service';
import { FolderSyncGateway } from '../gateways/folder-sync.gateway';
import { Folder } from '@prisma/client';
import * as path from 'path';

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
    private readonly folderSyncGateway: FolderSyncGateway,
  ) {}

  async checkDeletionStatus(
    documentId: string,
    userId: string,
  ): Promise<DeletionStatus> {
    const document = await this.documentService.findById(documentId);
    const user = await this.usersService.findById(userId);

    // Check if user is DCC (can always delete)
    // Note: UsersService.findById() already transforms roles to Array<{ name: string }>
    const userWithRelations = user as unknown as UserWithRelations;
    const isDCC = userWithRelations.roles?.some((role) => role.name === 'dcc') || false;
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
          DocumentDeletionService.DELETION_WINDOW_MS,
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
          (d) => d.departmentId === folderDepartmentId,
        ) || false
      : false;

    const canSelfDelete = (isUploader || isSameDepartment) && !isExpired;

    // Check for active request (only PENDING requests are considered "active")
    const activeRequest = await (
      this.prisma as PrismaClientLike
    ).deletionRequest.findFirst({
      where: {
        documentId,
        status: 'PENDING',
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
    this.logger.log(`User ${userId} attempting to delete document ${documentId}`);
    const status = await this.checkDeletionStatus(documentId, userId);

    if (!status.canDelete) {
      if (status.isExpired) {
        this.logger.warn(
          `Deletion blocked: Document ${documentId} expired for user ${userId}`,
        );
        throw new ForbiddenException(
          'Cannot delete: 72-hour window expired. Please submit a deletion request to DCC.',
        );
      }
      this.logger.warn(
        `Deletion blocked: User ${userId} lacks permission for document ${documentId}`,
      );
      throw new ForbiddenException(
        'You do not have permission to delete this document',
      );
    }

    await this.executeDelete(
      documentId,
      userId,
      'Self-deletion within 72-hour window',
    );
    this.logger.log(
      `Document ${documentId} deleted successfully by user ${userId}`,
    );
  }

  async submitDeletionRequest(
    documentId: string,
    userId: string,
    reason: string,
    replacementFileId?: string,
  ) {
    this.logger.log(
      `User ${userId} submitting deletion request for document ${documentId}`,
    );
    const status = await this.checkDeletionStatus(documentId, userId);

    if (!status.requiresDCCApproval) {
      throw new BadRequestException(
        'You can still delete this document directly. DCC approval only required after 72 hours.',
      );
    }

    if (status.hasActiveRequest) {
      throw new BadRequestException(
        'A deletion request for this document already exists',
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
    if (existingRequest && existingRequest.status === 'REJECTED') {
      this.logger.log(
        `Resubmitting rejected deletion request ${existingRequest.id} for document ${documentId}`,
      );
      const updatedRequest = await (
        this.prisma as PrismaClientLike
      ).deletionRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: 'PENDING',
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
        `Deletion request resubmitted: ${updatedRequest.id} for document ${documentId} by user ${userId}`,
      );
      // TODO: Send notification to DCC users

      return updatedRequest;
    }

    // If request exists with other status (APPROVED), throw error
    if (existingRequest) {
      throw new BadRequestException(
        'A deletion request for this document already exists with status: ' +
          existingRequest.status,
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
        status: 'PENDING',
      },
      include: {
        document: true,
        requester: true,
        replacementFile: true,
      },
    });

    this.logger.log(
      `Deletion request created: ${request.id} for document ${documentId} by user ${userId}`,
    );
    // TODO: Send notification to DCC users

    return request;
  }

  async reviewRequest(
    requestId: string,
    userId: string,
    approve: boolean,
    comment?: string,
  ) {
    this.logger.log(
      `DCC user ${userId} reviewing deletion request ${requestId}: ${approve ? 'APPROVE' : 'REJECT'}`,
    );
    const user = await this.usersService.findById(userId);
    // Note: UsersService.findById() already transforms roles to Array<{ name: string }>
    const userWithRelations = user as unknown as UserWithRelations;
    const isDCC = userWithRelations.roles?.some((role) => role.name === 'dcc') || false;

    if (!isDCC) {
      throw new ForbiddenException(
        'Only DCC members can review deletion requests',
      );
    }

    const request = await (
      this.prisma as PrismaClientLike
    ).deletionRequest.findUnique({
      where: { id: requestId },
      include: { document: true },
    });

    if (!request) {
      throw new NotFoundException('Deletion request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('This request has already been reviewed');
    }

    const updatedRequest = await (
      this.prisma as PrismaClientLike
    ).deletionRequest.update({
      where: { id: requestId },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
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
        `Executing deletion for document ${request.documentId} after DCC approval`,
      );
      await this.executeDelete(
        request.documentId,
        userId,
        `DCC approved deletion request: ${request.reason}`,
      );
      // document_deleted event is already broadcast by executeDelete
    } else {
      this.logger.log(
        `Deletion request ${requestId} rejected by DCC user ${userId}`,
      );
      // Broadcast event so frontend can update UI
      this.folderSyncGateway.broadcastSyncEvent({
        type: 'deletion_request_rejected',
        documentId: request.documentId,
        data: { requestId: updatedRequest.id },
      });
    }

    // TODO: Send notification to requester

    return updatedRequest;
  }

  async listPendingRequests() {
    return (this.prisma as PrismaClientLike).deletionRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        document: {
          include: { folder: true },
        },
        requester: true,
        replacementFile: true,
      },
      orderBy: { requestedAt: 'asc' },
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
      throw new NotFoundException('Deletion request not found');
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
      orderBy: { requestedAt: 'desc' },
    });
  }

  async getRequestByDocumentId(documentId: string, userId: string) {
    const user = await this.usersService.findById(userId);
    const userWithRelations = user as unknown as UserWithRelations;
    const isDCC = userWithRelations.roles?.some((role) => role.name === 'dcc') || false;

    const request = await (this.prisma as PrismaClientLike).deletionRequest.findFirst({
      where: { documentId },
      include: {
        reviewer: true,
        requester: true,
      },
      orderBy: { requestedAt: 'desc' },
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
      'You do not have permission to view this deletion request',
    );
  }

  private async executeDelete(
    documentId: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    const document = await this.documentService.findById(documentId);
    const currentFolder = await this.folderService.findById(document.folderId);

    // Find department ID
    const departmentId =
      currentFolder.departmentId ||
      (await this.findDepartmentIdForFolder(currentFolder));

    if (!departmentId) {
      throw new BadRequestException('Cannot determine department for document');
    }

    // Find or create "Deleted files" folder
    const deleteFolder = await this.findOrCreateDeleteFolder(departmentId);

    // Move file physically
    // Use filename from filePath (which uses Unique ID format) instead of original fileName
    // This ensures consistency with the new storage format
    const oldFilePath = document.filePath;
    
    // Validate filePath points to a file, not a folder
    try {
      const fileStats = await this.smbService.getFileStats(oldFilePath);
      if (fileStats.isDirectory()) {
        throw new BadRequestException(
          `Cannot delete: filePath points to a folder instead of a file. ` +
          `Document may be corrupted. Document ID: ${documentId}, filePath: ${oldFilePath}`
        );
      }
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;
      // If file doesn't exist, check if it's a permission issue or missing file
      if (nodeError.code === 'ENOENT') {
        throw new NotFoundException(
          `File not found at path: ${oldFilePath}. Document may have been moved or deleted.`
        );
      }
      // Re-throw if it's the BadRequestException we just threw
      if (error instanceof BadRequestException) {
        throw error;
      }
      // For other errors, log and continue (might be permission issue, will fail on rename)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to validate filePath before deletion: ${errorMessage}. Will attempt rename anyway.`
      );
    }
    
    const physicalFileName = path.basename(oldFilePath); // Extract ID-based filename from filePath
    const newFilePath = path.join(deleteFolder.path, physicalFileName);

    // Move file first (most likely to fail)
    // Wrap in try-catch for better error handling
    try {
      await this.smbService.rename(oldFilePath, newFilePath);
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'EPERM') {
        // Check if source is actually a folder (permission error might indicate folder)
        try {
          const stats = await this.smbService.getFileStats(oldFilePath);
          if (stats.isDirectory()) {
            throw new BadRequestException(
              `Cannot delete: filePath points to a folder. ` +
              `Document ID: ${documentId}, filePath: ${oldFilePath}. ` +
              `Please contact administrator to fix document record.`
            );
          }
        } catch (statsError: unknown) {
          // If we can't check stats, provide generic permission error
          const statsErrorMessage = statsError instanceof Error ? statsError.message : 'Unknown error';
          this.logger.warn(
            `Failed to check file stats after EPERM error: ${statsErrorMessage}`
          );
        }
        throw new ForbiddenException(
          `Permission denied: Cannot move file to delete folder. ` +
          `Check SMB share permissions for path: ${oldFilePath} -> ${newFilePath}`
        );
      }
      throw error;
    }

    // Use transaction for atomic database operations
    // Note: File move cannot be rolled back, but DB operations are atomic
    try {
      await this.prisma.$transaction(async (tx) => {
        // Update document record
        await (tx as PrismaClientLike).document.update({
          where: { id: documentId },
          data: {
            folderId: deleteFolder.id,
            filePath: newFilePath,
            status: 'DELETED',
          },
        });

        // Create audit log
        await (tx as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: 'DELETE',
            resourceType: 'Document',
            resourceId: documentId,
            details: {
              reason,
              originalPath: oldFilePath,
              newPath: newFilePath,
            },
          },
        });
      });
    } catch (error) {
      // If DB transaction fails, attempt to move file back
      // This is best-effort recovery
      try {
        await this.smbService.rename(newFilePath, oldFilePath);
      } catch (revertError) {
        // Log error but don't throw - file is orphaned but DB is consistent
        this.logger.error(
          `Failed to revert file move after DB error. File orphaned: ${newFilePath}`,
          revertError,
        );
      }
      throw error;
    }
    this.logger.log(
      `Deletion completed: Document ${documentId} moved to ${newFilePath}`,
    );
  }

  private async findOrCreateDeleteFolder(departmentId: string) {
    const department = await (
      this.prisma as PrismaClientLike
    ).department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new BadRequestException('Department not found');
    }

    const deleteFolderPath = `${department.code}/Deleted files`;

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
        deleteFolder = await (
          this.prisma as PrismaClientLike
        ).folder.create({
          data: {
            name: 'Deleted files',
            path: deleteFolderPath,
            departmentId,
          },
        });
      } catch (error) {
        if (error.code === 'P2002') {
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
      throw new BadRequestException('Failed to create or find delete folder');
    }

    return deleteFolder;
  }

  private async findDepartmentIdForFolder(folder: FolderWithDepartment): Promise<string | null> {
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
