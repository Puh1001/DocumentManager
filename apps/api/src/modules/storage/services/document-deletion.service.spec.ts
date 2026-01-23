import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { DocumentDeletionService } from './document-deletion.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DocumentService } from './document.service';
import { FolderService } from './folder.service';
import { SmbService } from './smb.service';
import { UsersService } from '@/modules/users/users.service';
import { PrismaClientLike } from '@/common/types/prisma.types';

describe('DocumentDeletionService', () => {
  let service: DocumentDeletionService;
  let prismaService: jest.Mocked<PrismaService>;
  let documentService: jest.Mocked<DocumentService>;
  let folderService: jest.Mocked<FolderService>;
  let smbService: jest.Mocked<SmbService>;
  let usersService: jest.Mocked<UsersService>;

  const mockDocument = {
    id: 'doc-1',
    name: 'Test Document',
    fileName: 'test-document.pdf',
    fileType: 'pdf',
    fileSize: 1024,
    filePath: 'test-folder/doc-1.pdf', // ID-based filename
    folderId: 'folder-1',
    uploadedBy: 'user-1',
    uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'ACTIVE',
    folder: {
      id: 'folder-1',
      name: 'Test Folder',
      departmentId: 'dept-1',
    },
  };

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    roles: [
      {
        role: {
          name: 'user',
        },
      },
    ],
    departments: [
      {
        departmentId: 'dept-1',
      },
    ],
  };

  const mockDCCUser = {
    id: 'dcc-1',
    username: 'dccuser',
    roles: [
      {
        role: {
          name: 'dcc',
        },
      },
    ],
    departments: [],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      document: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      deletionRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      folder: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) =>
          callback(mockPrismaService),
      ) as never,
    };

    const mockDocumentService = {
      findById: jest.fn(),
    };

    const mockFolderService = {
      findById: jest.fn(),
    };

    const mockSmbService = {
      rename: jest.fn(),
      createDirectory: jest.fn(),
    };

    const mockUsersService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentDeletionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DocumentService, useValue: mockDocumentService },
        { provide: FolderService, useValue: mockFolderService },
        { provide: SmbService, useValue: mockSmbService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<DocumentDeletionService>(DocumentDeletionService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
    documentService = module.get(DocumentService);
    folderService = module.get(FolderService);
    smbService = module.get(SmbService);
    usersService = module.get(UsersService);

    // Ensure department mock exists
    if (!prismaService.department) {
      (prismaService as unknown as Record<string, unknown>).department = {
        findUnique: jest.fn(),
      };
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDeletionStatus', () => {
    it('should allow deletion within 72 hours', async () => {
      const document = {
        ...mockDocument,
        uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      documentService.findById.mockResolvedValue(document as never);
      usersService.findById.mockResolvedValue(mockUser as never);
      (prismaService.deletionRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const status = await service.checkDeletionStatus('doc-1', 'user-1');

      expect(status.canDelete).toBe(true);
      expect(status.isExpired).toBe(false);
      expect(status.remainingHours).toBeGreaterThanOrEqual(47);
      expect(status.requiresDCCApproval).toBe(false);
    });

    it('should block deletion after 72 hours', async () => {
      const document = {
        ...mockDocument,
        uploadedAt: new Date(Date.now() - 73 * 60 * 60 * 1000), // 73 hours ago
      };

      documentService.findById.mockResolvedValue(document as never);
      usersService.findById.mockResolvedValue(mockUser as never);
      (prismaService.deletionRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const status = await service.checkDeletionStatus('doc-1', 'user-1');

      expect(status.canDelete).toBe(false);
      expect(status.isExpired).toBe(true);
      expect(status.requiresDCCApproval).toBe(true);
    });

    it('should allow DCC to delete anytime', async () => {
      const document = {
        ...mockDocument,
        uploadedAt: new Date(Date.now() - 100 * 60 * 60 * 1000), // 100 hours ago
      };

      documentService.findById.mockResolvedValue(document as never);
      usersService.findById.mockResolvedValue(mockDCCUser as never);

      const status = await service.checkDeletionStatus('doc-1', 'dcc-1');

      expect(status.canDelete).toBe(true);
      expect(status.isExpired).toBe(false);
      expect(status.remainingHours).toBe(Infinity);
      expect(status.requiresDCCApproval).toBe(false);
    });

    it('should detect active deletion request', async () => {
      const document = {
        ...mockDocument,
        uploadedAt: new Date(Date.now() - 73 * 60 * 60 * 1000),
      };

      const activeRequest = {
        id: 'request-1',
        documentId: 'doc-1',
        status: 'PENDING',
      };

      documentService.findById.mockResolvedValue(document as never);
      usersService.findById.mockResolvedValue(mockUser as never);
      (prismaService.deletionRequest.findUnique as jest.Mock).mockResolvedValue(activeRequest);

      const status = await service.checkDeletionStatus('doc-1', 'user-1');

      expect(status.hasActiveRequest).toBe(true);
      expect(status.requestId).toBe('request-1');
    });
  });

  describe('submitDeletionRequest', () => {
    it('should create deletion request after expiry', async () => {
      const document = {
        ...mockDocument,
        uploadedAt: new Date(Date.now() - 73 * 60 * 60 * 1000),
      };

      documentService.findById.mockResolvedValue(document as never);
      usersService.findById.mockResolvedValue(mockUser as never);
      (prismaService.deletionRequest.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.deletionRequest.create as jest.Mock).mockResolvedValue({
        id: 'request-1',
        documentId: 'doc-1',
        requestedBy: 'user-1',
        reason: 'Document outdated',
        status: 'PENDING',
        requestedAt: new Date(),
      } as never);

      const request = await service.submitDeletionRequest(
        'doc-1',
        'user-1',
        'Document outdated',
        'replacement-file-id',
      );

      expect(request.status).toBe('PENDING');
      expect(request.reason).toBe('Document outdated');
      expect((prismaService as unknown as PrismaClientLike).deletionRequest.create).toHaveBeenCalled();
    });

    it('should reject request if within 72h', async () => {
      const document = {
        ...mockDocument,
        uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      documentService.findById.mockResolvedValue(document as never);
      usersService.findById.mockResolvedValue(mockUser as never);
      (prismaService.deletionRequest.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.submitDeletionRequest('doc-1', 'user-1', 'Test reason'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitDeletionRequest('doc-1', 'user-1', 'Test reason'),
      ).rejects.toThrow('You can still delete this document directly');
    });

    it('should reject duplicate requests', async () => {
      const document = {
        ...mockDocument,
        uploadedAt: new Date(Date.now() - 73 * 60 * 60 * 1000),
      };

      const existingRequest = {
        id: 'request-1',
        documentId: 'doc-1',
        status: 'PENDING',
      };

      documentService.findById.mockResolvedValue(document as never);
      usersService.findById.mockResolvedValue(mockUser as never);
      (prismaService.deletionRequest.findUnique as jest.Mock).mockResolvedValue(existingRequest);

      await expect(
        service.submitDeletionRequest('doc-1', 'user-1', 'Reason 2'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitDeletionRequest('doc-1', 'user-1', 'Reason 2'),
      ).rejects.toThrow('A deletion request for this document already exists');
    });
  });

  describe('reviewRequest', () => {
    it('should approve and delete document', async () => {
      const request = {
        id: 'request-1',
        documentId: 'doc-1',
        status: 'PENDING',
        requestedBy: 'user-1',
        document: {
          ...mockDocument,
          folder: {
            ...mockDocument.folder,
            departmentId: 'dept-1',
          },
        },
      };

      const document = {
        ...mockDocument,
        uploadedAt: new Date(Date.now() - 73 * 60 * 60 * 1000),
        folder: {
          ...mockDocument.folder,
          departmentId: 'dept-1',
        },
      };

      const deleteFolder = {
        id: 'delete-folder',
        name: 'Deleted files',
        path: 'IT/Deleted files',
        departmentId: 'dept-1',
      };

      (prismaService.deletionRequest.findUnique as jest.Mock).mockResolvedValue(request);
      documentService.findById.mockResolvedValue(document as never);
      usersService.findById.mockResolvedValue(mockDCCUser as never);
      folderService.findById.mockResolvedValue(deleteFolder as never);
      (prismaService.folder.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.folder.create as jest.Mock).mockResolvedValue(deleteFolder);
      const departmentMock = (prismaService as unknown as Record<string, unknown>).department as { findUnique: jest.Mock };
      departmentMock.findUnique.mockResolvedValue({
        id: 'dept-1',
        name: 'Test Department',
      });
      smbService.rename.mockResolvedValue(undefined);
      (prismaService.document.update as jest.Mock).mockResolvedValue({
        ...document,
        status: 'DELETED',
      });
      (prismaService.deletionRequest.update as jest.Mock).mockResolvedValue({
        ...request,
        status: 'APPROVED',
        reviewedBy: 'dcc-1',
      });
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

      const result = await service.reviewRequest('request-1', 'dcc-1', true, 'Approved');

      expect(result.status).toBe('APPROVED');
      expect(result.reviewedBy).toBe('dcc-1');
    });

    it('should reject non-DCC users', async () => {
      const request = {
        id: 'request-1',
        documentId: 'doc-1',
        status: 'PENDING',
      };

      (prismaService.deletionRequest.findUnique as jest.Mock).mockResolvedValue(request);
      usersService.findById.mockResolvedValue(mockUser as never);

      await expect(
        service.reviewRequest('request-1', 'user-1', true),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject request with comment', async () => {
      const request = {
        id: 'request-1',
        documentId: 'doc-1',
        status: 'PENDING',
      };

      (prismaService.deletionRequest.findUnique as jest.Mock).mockResolvedValue(request);
      usersService.findById.mockResolvedValue(mockDCCUser as never);
      (prismaService.deletionRequest.update as jest.Mock).mockResolvedValue({
        ...request,
        status: 'REJECTED',
        reviewedBy: 'dcc-1',
        reviewerComment: 'Does not meet requirements',
      });

      const result = await service.reviewRequest(
        'request-1',
        'dcc-1',
        false,
        'Does not meet requirements',
      );

      expect(result.status).toBe('REJECTED');
      expect(result.reviewerComment).toBe('Does not meet requirements');
    });
  });

  describe('selfDelete', () => {
    it('should delete document within 72h', async () => {
      const document = {
        ...mockDocument,
        uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        folder: {
          ...mockDocument.folder,
          departmentId: 'dept-1',
        },
      };

      const deleteFolder = {
        id: 'delete-folder',
        name: 'Deleted files',
        path: 'IT/Deleted files',
        departmentId: 'dept-1',
      };

      documentService.findById.mockResolvedValue(document as never);
      usersService.findById.mockResolvedValue(mockUser as never);
      (prismaService.deletionRequest.findUnique as jest.Mock).mockResolvedValue(null);
      folderService.findById.mockResolvedValue(deleteFolder as never);
      (prismaService.folder.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.folder.create as jest.Mock).mockResolvedValue(deleteFolder);
      const departmentMock = (prismaService as unknown as Record<string, unknown>).department as { findUnique: jest.Mock };
      departmentMock.findUnique.mockResolvedValue({
        id: 'dept-1',
        name: 'Test Department',
      });
      smbService.rename.mockResolvedValue(undefined);
      (prismaService.document.update as jest.Mock).mockResolvedValue({
        ...document,
        status: 'DELETED',
      });
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

      await service.selfDelete('doc-1', 'user-1');

      expect(smbService.rename).toHaveBeenCalled();
      expect(prismaService.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DELETED',
          }),
        }),
      );
    });

    it('should throw error if deletion window expired', async () => {
      const document = {
        ...mockDocument,
        uploadedAt: new Date(Date.now() - 73 * 60 * 60 * 1000),
      };

      documentService.findById.mockResolvedValue(document as never);
      usersService.findById.mockResolvedValue(mockUser as never);
      (prismaService.deletionRequest.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.selfDelete('doc-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('listPendingRequests', () => {
    it('should return pending deletion requests', async () => {
      const requests = [
        {
          id: 'request-1',
          documentId: 'doc-1',
          status: 'PENDING',
          requestedAt: new Date(),
          reason: 'Test reason',
          document: mockDocument,
          requester: mockUser,
        },
      ];

      (prismaService.deletionRequest.findMany as jest.Mock).mockResolvedValue(requests);

      const result = await service.listPendingRequests();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PENDING');
      expect(prismaService.deletionRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        }),
      );
    });
  });
});
