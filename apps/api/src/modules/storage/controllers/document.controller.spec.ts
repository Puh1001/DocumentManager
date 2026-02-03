import { Test, TestingModule } from "@nestjs/testing";
import { DocumentController } from "./document.controller";
import { DocumentService } from "../services/document.service";
import { VersionService } from "../services/version.service";
import { LocalEditService } from "../services/local-edit.service";
import { DocumentDeletionService } from "../services/document-deletion.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { UsersService } from "@/modules/users/users.service";
import { QueryDocumentsDto } from "../dto/query-documents.dto";
import { PoliciesGuard } from "@/modules/authorization/guards/policies.guard";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { Express } from "express";
import { Readable } from "stream";
import { Response } from "express";
import { AuthenticatedRequest } from "@/common/types/request.types";

describe("DocumentController", () => {
  let controller: DocumentController;
  let documentService: jest.Mocked<DocumentService>;
  let versionService: jest.Mocked<VersionService>;
  let localEditService: jest.Mocked<LocalEditService>;

  const mockDocument = {
    id: "doc-1",
    name: "Test Document",
    fileName: "test-document.pdf",
    fileType: "pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
    filePath: "test-folder/current/doc-1.pdf", // ID-based filename
    folder: {
      id: "folder-1",
      name: "Test Folder",
    },
  };

  const mockFile: Express.Multer.File = {
    fieldname: "file",
    originalname: "test-document.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: 1024,
    buffer: Buffer.from("test content"),
    destination: "",
    filename: "",
    path: "",
    stream: null as unknown as Readable,
  };

  const mockRequest = {
    user: {
      id: "user-1",
      username: "testuser",
      roles: ["admin"],
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    const mockDocumentService = {
      findById: jest.fn(),
      findAll: jest.fn(),
      upload: jest.fn(),
      updateFile: jest.fn(),
      updateIsoMetadata: jest.fn(),
      getStream: jest.fn(),
      download: jest.fn(),
      archive: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
    };

    const mockVersionService = {
      listVersions: jest.fn(),
      getVersion: jest.fn(),
      downloadVersion: jest.fn(),
      restoreVersion: jest.fn(),
    };

    const mockLocalEditService = {
      getOpenFilePath: jest.fn(),
    };

    const mockDeletionService = {
      submitDeletionRequest: jest.fn(),
      getDeletionStatus: jest.fn(),
      reviewDeletionRequest: jest.fn(),
    };

    const mockPrismaService = {
      auditLog: { create: jest.fn() },
    };

    const mockUsersService = {
      getUserDepartments: jest.fn(),
    };

    const mockPoliciesGuard = { canActivate: jest.fn(() => true) };
    const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [
        { provide: DocumentService, useValue: mockDocumentService },
        { provide: VersionService, useValue: mockVersionService },
        { provide: LocalEditService, useValue: mockLocalEditService },
        { provide: DocumentDeletionService, useValue: mockDeletionService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(PoliciesGuard)
      .useValue(mockPoliciesGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<DocumentController>(DocumentController);
    documentService = module.get(DocumentService);
    versionService = module.get(VersionService);
    localEditService = module.get(LocalEditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    const mockDocuments = [
      {
        ...mockDocument,
        folder: {
          ...mockDocument.folder,
          department: {
            id: "dept-1",
            name: "Test Department",
            code: "TEST",
          },
        },
        _count: {
          versions: 2,
        },
      },
    ];

    it("should return all documents when no filters provided", async () => {
      const mockPaginatedResponse = {
        data: mockDocuments,
        total: mockDocuments.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      documentService.findAll = jest
        .fn()
        .mockResolvedValue(mockPaginatedResponse);

      const query: QueryDocumentsDto = {};
      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockPaginatedResponse);
      expect(documentService.findAll).toHaveBeenCalledWith({
        status: undefined,
        departmentId: undefined,
        departmentIdsForFilter: undefined,
        level: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it("should filter by status when status provided", async () => {
      const mockPaginatedResponse = {
        data: mockDocuments,
        total: mockDocuments.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      documentService.findAll = jest
        .fn()
        .mockResolvedValue(mockPaginatedResponse);

      const query: QueryDocumentsDto = { status: "ACTIVE" };
      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockPaginatedResponse);
      expect(documentService.findAll).toHaveBeenCalledWith({
        status: "ACTIVE",
        departmentId: undefined,
        departmentIdsForFilter: undefined,
        level: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it("should filter by departmentId when departmentId provided", async () => {
      const mockPaginatedResponse = {
        data: mockDocuments,
        total: mockDocuments.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      documentService.findAll = jest
        .fn()
        .mockResolvedValue(mockPaginatedResponse);

      const query: QueryDocumentsDto = { departmentId: "dept-1" };
      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockPaginatedResponse);
      expect(documentService.findAll).toHaveBeenCalledWith({
        status: undefined,
        departmentId: "dept-1",
        departmentIdsForFilter: undefined,
        level: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it("should filter by both status and departmentId when both provided", async () => {
      const mockPaginatedResponse = {
        data: mockDocuments,
        total: mockDocuments.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      documentService.findAll = jest
        .fn()
        .mockResolvedValue(mockPaginatedResponse);

      const query: QueryDocumentsDto = {
        status: "ARCHIVED",
        departmentId: "dept-1",
      };
      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockPaginatedResponse);
      expect(documentService.findAll).toHaveBeenCalledWith({
        status: "ARCHIVED",
        departmentId: "dept-1",
        departmentIdsForFilter: undefined,
        level: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it("should include level filter when level provided", async () => {
      const mockPaginatedResponse = {
        data: mockDocuments,
        total: mockDocuments.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      documentService.findAll = jest
        .fn()
        .mockResolvedValue(mockPaginatedResponse);

      const query: QueryDocumentsDto = { level: "LEVEL1" };
      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockPaginatedResponse);
      expect(documentService.findAll).toHaveBeenCalledWith({
        status: undefined,
        departmentId: undefined,
        departmentIdsForFilter: undefined,
        level: "LEVEL1",
        page: undefined,
        limit: undefined,
      });
    });

    it("should support pagination with page and limit", async () => {
      const mockPaginatedResponse = {
        data: mockDocuments,
        total: 50,
        page: 2,
        limit: 10,
        totalPages: 5,
      };
      documentService.findAll = jest
        .fn()
        .mockResolvedValue(mockPaginatedResponse);

      const query: QueryDocumentsDto = { page: 2, limit: 10 };
      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockPaginatedResponse);
      expect(documentService.findAll).toHaveBeenCalledWith({
        status: undefined,
        departmentId: undefined,
        departmentIdsForFilter: undefined,
        level: undefined,
        page: 2,
        limit: 10,
      });
    });
  });

  describe("updateIsoMetadata", () => {
    it("should update document ISO metadata and return document", async () => {
      const updatedDoc = {
        ...mockDocument,
        levelId: "level-1",
        preparerId: "user-1",
        reviewerId: "user-2",
        approverId: "user-3",
        approvalDate: new Date("2026-01-30"),
        receiptDate: new Date("2026-01-29"),
      };
      documentService.findById = jest.fn().mockResolvedValue(mockDocument);
      documentService.updateIsoMetadata = jest
        .fn()
        .mockResolvedValue(updatedDoc);

      const dto = {
        levelId: "level-1",
        reviewerId: "user-2",
        approvalDate: "2026-01-30T00:00:00.000Z",
      };
      const result = await controller.updateIsoMetadata(
        "doc-1",
        dto,
        mockRequest
      );

      expect(result).toEqual(updatedDoc);
      expect(documentService.updateIsoMetadata).toHaveBeenCalledWith(
        "doc-1",
        dto,
        "user-1"
      );
    });
  });

  describe("findOne", () => {
    it("should return document by id", async () => {
      documentService.findById = jest.fn().mockResolvedValue(mockDocument);
      const mockRequest = {
        user: { id: "user-1" },
        ip: "127.0.0.1",
        get: () => "Mozilla",
      } as unknown as AuthenticatedRequest;

      const result = await controller.findOne("doc-1", mockRequest);

      expect(result).toEqual(mockDocument);
      expect(documentService.findById).toHaveBeenCalledWith("doc-1");
    });
  });

  describe("stream", () => {
    it("should stream document content", async () => {
      const mockStream = new Readable();
      mockStream.pipe = jest.fn().mockReturnValue(mockStream);
      const mockResponse = {
        setHeader: jest.fn(),
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      documentService.findById = jest.fn().mockResolvedValue(mockDocument);
      documentService.getStream = jest.fn().mockResolvedValue(mockStream);
      const mockRequest = {
        user: { id: "user-1" },
        ip: "127.0.0.1",
        get: () => "Mozilla",
      } as unknown as AuthenticatedRequest;

      await controller.stream(
        "doc-1",
        mockResponse as unknown as Response,
        mockRequest
      );

      expect(documentService.findById).toHaveBeenCalledWith("doc-1");
      expect(documentService.getStream).toHaveBeenCalledWith("doc-1");
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        "inline"
      );
      expect(mockStream.pipe).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe("download", () => {
    it("should download document", async () => {
      const buffer = Buffer.from("file content");
      const mockResponse = {
        setHeader: jest.fn(),
        setHeaderLength: jest.fn(),
        send: jest.fn(),
      } as jest.Mocked<Partial<Response>>;

      documentService.findById = jest.fn().mockResolvedValue(mockDocument);
      documentService.download = jest.fn().mockResolvedValue({
        buffer,
        fileName: "test-document.pdf",
        mimeType: "application/pdf",
      });

      await controller.download(
        "doc-1",
        mockResponse as unknown as Response,
        mockRequest
      );

      expect(documentService.download).toHaveBeenCalledWith("doc-1");
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="test-document.pdf"'
      );
      expect(mockResponse.send).toHaveBeenCalledWith(buffer);
    });
  });

  describe("upload", () => {
    it("should upload new document", async () => {
      documentService.upload = jest.fn().mockResolvedValue(mockDocument);

      const result = await controller.upload(
        mockFile,
        "folder-1",
        "Custom Name",
        mockRequest,
        undefined,
        "level-1"
      );

      expect(result).toEqual(mockDocument);
      expect(documentService.upload).toHaveBeenCalledWith(
        "folder-1",
        mockFile,
        "user-1",
        "Custom Name",
        undefined,
        "level-1",
        {
          userDepartmentIds: undefined,
          userCanUploadToAnyFolder: true,
        }
      );
    });

    it("should upload document without custom name", async () => {
      documentService.upload = jest.fn().mockResolvedValue(mockDocument);

      await controller.upload(
        mockFile,
        "folder-1",
        "",
        mockRequest,
        undefined,
        "level-1"
      );

      expect(documentService.upload).toHaveBeenCalledWith(
        "folder-1",
        mockFile,
        "user-1",
        "",
        undefined,
        "level-1",
        {
          userDepartmentIds: undefined,
          userCanUploadToAnyFolder: true,
        }
      );
    });
  });

  describe("uploadVersion", () => {
    it("should upload new version", async () => {
      documentService.updateFile = jest.fn().mockResolvedValue(mockDocument);

      const result = await controller.uploadVersion(
        "doc-1",
        mockFile,
        "Updated version",
        mockRequest
      );

      expect(result).toEqual(mockDocument);
      expect(documentService.updateFile).toHaveBeenCalledWith(
        "doc-1",
        mockFile,
        "user-1",
        "Updated version"
      );
    });
  });

  describe("archive", () => {
    it("should archive document", async () => {
      const archivedDocument = { ...mockDocument, status: "ARCHIVED" };
      documentService.archive = jest.fn().mockResolvedValue(archivedDocument);

      const result = await controller.archive("doc-1");

      expect(result.status).toBe("ARCHIVED");
      expect(documentService.archive).toHaveBeenCalledWith("doc-1");
    });
  });

  describe("remove", () => {
    it("should delete document", async () => {
      // Mock deletion service
      const deletionService: Partial<DocumentDeletionService> = {
        selfDelete: jest.fn().mockResolvedValue(undefined),
      };

      // Mock prisma service
      const mockPrisma = {
        auditLog: {
          create: jest.fn(),
        },
      } as unknown as PrismaService;

      const mockUsers = {
        getUserDepartments: jest.fn(),
      } as unknown as UsersService;

      // Create controller with mocked deletion service
      const controllerWithDeletion = new DocumentController(
        documentService,
        versionService,
        localEditService,
        deletionService as DocumentDeletionService,
        mockPrisma,
        mockUsers
      );

      const mockReq: AuthenticatedRequest = {
        user: { id: "user-1" },
      } as AuthenticatedRequest;
      await controllerWithDeletion.remove("doc-1", mockReq);

      expect(deletionService.selfDelete).toHaveBeenCalledWith(
        "doc-1",
        "user-1"
      );
    });
  });

  describe("getOpenPath", () => {
    it("should return open path for document", async () => {
      const mockOpenPath = {
        networkPath: "\\\\10.0.60.30\\Public\\test-document.pdf",
        fileUrl: "file:///10.0.60.30/Public/test-document.pdf",
        explorerCommand:
          'explorer.exe "\\\\10.0.60.30\\Public\\test-document.pdf"',
      };

      documentService.findById = jest.fn().mockResolvedValue(mockDocument);
      localEditService.getOpenFilePath = jest
        .fn()
        .mockReturnValue(mockOpenPath);

      const result = await controller.getOpenPath("doc-1");

      expect(result).toEqual(mockOpenPath);
      expect(documentService.findById).toHaveBeenCalledWith("doc-1");
      expect(localEditService.getOpenFilePath).toHaveBeenCalledWith(
        mockDocument.filePath
      );
    });
  });

  describe("search", () => {
    it("should search documents", async () => {
      const mockDocuments = [mockDocument];
      documentService.search = jest.fn().mockResolvedValue(mockDocuments);

      const result = await controller.search("test", undefined);

      expect(result).toEqual(mockDocuments);
      expect(documentService.search).toHaveBeenCalledWith("test", undefined);
    });

    it("should search documents in specific folder", async () => {
      const mockDocuments = [mockDocument];
      documentService.search = jest.fn().mockResolvedValue(mockDocuments);

      const result = await controller.search("test", "folder-1");

      expect(result).toEqual(mockDocuments);
      expect(documentService.search).toHaveBeenCalledWith("test", "folder-1");
    });
  });

  describe("listVersions", () => {
    it("should list document versions", async () => {
      const mockVersions = [
        {
          id: "version-1",
          version: 1,
          fileName: "test-document.pdf",
        },
      ];

      versionService.listVersions = jest.fn().mockResolvedValue(mockVersions);

      const result = await controller.listVersions("doc-1");

      expect(result).toEqual(mockVersions);
      expect(versionService.listVersions).toHaveBeenCalledWith("doc-1");
    });
  });

  describe("getVersion", () => {
    it("should return specific version", async () => {
      const mockVersion = {
        id: "version-1",
        version: 1,
        fileName: "test-document.pdf",
      };

      versionService.getVersion = jest.fn().mockResolvedValue(mockVersion);

      const result = await controller.getVersion("doc-1", 1);

      expect(result).toEqual(mockVersion);
      expect(versionService.getVersion).toHaveBeenCalledWith("doc-1", 1);
    });
  });

  describe("downloadVersion", () => {
    it("should download specific version", async () => {
      const buffer = Buffer.from("version content");
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as jest.Mocked<Partial<Response>>;

      versionService.downloadVersion = jest.fn().mockResolvedValue({
        buffer,
        fileName: "test-document.pdf",
        version: 1,
      });

      await controller.downloadVersion(
        "doc-1",
        1,
        mockResponse as unknown as Response
      );

      expect(versionService.downloadVersion).toHaveBeenCalledWith("doc-1", 1);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="test-document.pdf"'
      );
      expect(mockResponse.send).toHaveBeenCalledWith(buffer);
    });
  });

  describe("restoreVersion", () => {
    it("should restore document to specific version", async () => {
      const restoredVersion = {
        id: "version-2",
        version: 2,
      };

      versionService.restoreVersion = jest
        .fn()
        .mockResolvedValue(restoredVersion);

      const result = await controller.restoreVersion("doc-1", 1, mockRequest);

      expect(result).toEqual(restoredVersion);
      expect(versionService.restoreVersion).toHaveBeenCalledWith(
        "doc-1",
        1,
        "user-1"
      );
    });
  });
});
