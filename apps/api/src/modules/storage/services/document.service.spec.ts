import { Test, TestingModule } from "@nestjs/testing";
import { CustomException } from "@/common/errors/custom-exception";
import { DocumentService } from "./document.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SmbService } from "./smb.service";
import { VersionService } from "./version.service";
import { Express } from "express";
import { Readable } from "stream";
import type * as fs from "fs";

describe("DocumentService", () => {
  let service: DocumentService;
  let prismaService: jest.Mocked<PrismaService>;
  let smbService: jest.Mocked<SmbService>;
  let versionService: jest.Mocked<VersionService>;

  const mockFolder = {
    id: "folder-1",
    name: "Test Folder",
    path: "test-folder",
    parentId: null,
    physicalLocation: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocument = {
    id: "doc-1",
    name: "Test Document",
    fileName: "test-document.pdf",
    fileType: "pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
    filePath: "test-folder/current/test-document.pdf",
    checksum: "abc123",
    folderId: "folder-1",
    status: "ACTIVE",
    fileCreatedAt: new Date(),
    fileModifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    folder: mockFolder,
    permissions: [],
  };

  const mockFile: Express.Multer.File = {
    fieldname: "file",
    originalname: "test-document.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: 1024,
    buffer: Buffer.from("test file content"),
    destination: "",
    filename: "",
    path: "",
    stream: null as unknown as Readable,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      document: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      folder: {
        findUnique: jest.fn(),
      },
    };

    const mockSmbService = {
      getFileStats: jest.fn(),
      readFileStream: jest.fn(),
      readFile: jest.fn(),
    };

    const mockVersionService = {
      createVersion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SmbService, useValue: mockSmbService },
        { provide: VersionService, useValue: mockVersionService },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    prismaService = module.get(PrismaService);
    smbService = module.get(SmbService);
    versionService = module.get(VersionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findById", () => {
    it("should return document by id", async () => {
      prismaService.document.findUnique = jest
        .fn()
        .mockResolvedValue(mockDocument);

      const result = await service.findById("doc-1");

      expect(result).toEqual(mockDocument);
      expect(prismaService.document.findUnique).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        include: {
          folder: true,
          permissions: {
            include: { permission: true },
          },
        },
      });
    });

    it("should throw NotFoundException when document does not exist", async () => {
      prismaService.document.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.findById("invalid-id")).rejects.toThrow(
        CustomException
      );
    });
  });

  describe("findByFolder", () => {
    it("should return documents in folder", async () => {
      const mockDocuments = [mockDocument];
      prismaService.document.findMany = jest
        .fn()
        .mockResolvedValue(mockDocuments);

      const result = await service.findByFolder("folder-1");

      expect(result).toEqual(mockDocuments);
      expect(prismaService.document.findMany).toHaveBeenCalledWith({
        where: { folderId: "folder-1", status: "ACTIVE" },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("upload", () => {
    it("should upload document and create version", async () => {
      const mockStats = {
        birthtime: new Date("2024-01-01"),
        mtime: new Date("2024-01-02"),
      } as fs.Stats;

      const mockVersion = {
        id: "version-1",
        documentId: "doc-1",
        version: 1,
        filePath: "test-folder/current/test-document.pdf",
        fileName: "test-document.pdf",
        fileSize: 1024,
        checksum: "abc123",
        createdBy: "user-1",
        createdAt: new Date(),
      };

      prismaService.folder.findUnique = jest.fn().mockResolvedValue(mockFolder);
      prismaService.document.create = jest.fn().mockResolvedValue({
        ...mockDocument,
        filePath: "",
      });
      versionService.createVersion = jest.fn().mockResolvedValue(mockVersion);
      smbService.getFileStats = jest.fn().mockResolvedValue(mockStats);
      prismaService.document.update = jest.fn().mockResolvedValue(mockDocument);
      prismaService.document.findUnique = jest
        .fn()
        .mockResolvedValueOnce(mockDocument)
        .mockResolvedValueOnce(mockDocument);

      const result = await service.upload("folder-1", mockFile, "user-1");

      expect(prismaService.folder.findUnique).toHaveBeenCalledWith({
        where: { id: "folder-1" },
      });
      expect(prismaService.document.create).toHaveBeenCalled();
      expect(versionService.createVersion).toHaveBeenCalledWith(
        expect.any(String),
        mockFile.buffer,
        "user-1",
        "Initial upload"
      );
      expect(smbService.getFileStats).toHaveBeenCalledWith(
        mockVersion.filePath
      );
      expect(result).toEqual(mockDocument);
    });

    it("should use custom name when provided", async () => {
      const mockStats = {
        birthtime: new Date(),
        mtime: new Date(),
      } as fs.Stats;

      const mockVersion = {
        id: "version-1",
        filePath: "test-folder/current/test-document.pdf",
      };

      prismaService.folder.findUnique = jest.fn().mockResolvedValue(mockFolder);
      prismaService.document.create = jest.fn().mockResolvedValue({
        ...mockDocument,
        name: "Custom Name",
        filePath: "",
      });
      versionService.createVersion = jest.fn().mockResolvedValue(mockVersion);
      smbService.getFileStats = jest.fn().mockResolvedValue(mockStats);
      prismaService.document.update = jest.fn().mockResolvedValue(mockDocument);
      prismaService.document.findUnique = jest
        .fn()
        .mockResolvedValue(mockDocument);

      await service.upload("folder-1", mockFile, "user-1", "Custom Name");

      expect(prismaService.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Custom Name",
        }),
      });
    });

    it("should throw NotFoundException when folder does not exist", async () => {
      prismaService.folder.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.upload("invalid-folder", mockFile, "user-1")
      ).rejects.toThrow(CustomException);
    });

    it("should handle file stats unavailable gracefully", async () => {
      const mockVersion = {
        id: "version-1",
        filePath: "test-folder/current/test-document.pdf",
      };

      prismaService.folder.findUnique = jest.fn().mockResolvedValue(mockFolder);
      prismaService.document.create = jest.fn().mockResolvedValue({
        ...mockDocument,
        filePath: "",
      });
      versionService.createVersion = jest.fn().mockResolvedValue(mockVersion);
      smbService.getFileStats = jest
        .fn()
        .mockRejectedValue(new Error("Stats unavailable"));
      prismaService.document.update = jest.fn().mockResolvedValue(mockDocument);
      prismaService.document.findUnique = jest
        .fn()
        .mockResolvedValue(mockDocument);

      const result = await service.upload("folder-1", mockFile, "user-1");

      expect(prismaService.document.update).toHaveBeenCalledWith({
        where: { id: expect.any(String) },
        data: { filePath: mockVersion.filePath },
      });
      expect(result).toEqual(mockDocument);
    });
  });

  describe("updateFile", () => {
    it("should create new version of document", async () => {
      prismaService.document.findUnique = jest
        .fn()
        .mockResolvedValue(mockDocument);
      versionService.createVersion = jest.fn().mockResolvedValue({
        id: "version-2",
        version: 2,
      });
      prismaService.document.findUnique = jest
        .fn()
        .mockResolvedValueOnce(mockDocument)
        .mockResolvedValueOnce(mockDocument);

      const result = await service.updateFile(
        "doc-1",
        mockFile,
        "user-1",
        "Updated version"
      );

      expect(versionService.createVersion).toHaveBeenCalledWith(
        "doc-1",
        mockFile.buffer,
        "user-1",
        "Updated version"
      );
      expect(result).toEqual(mockDocument);
    });

    it("should throw NotFoundException when document does not exist", async () => {
      prismaService.document.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.updateFile("invalid-id", mockFile, "user-1")
      ).rejects.toThrow(CustomException);
    });
  });

  describe("getStream", () => {
    it("should return file stream", async () => {
      const mockStream = {
        pipe: jest.fn(),
      } as unknown as Readable;

      prismaService.document.findUnique = jest
        .fn()
        .mockResolvedValue(mockDocument);
      smbService.readFileStream = jest.fn().mockResolvedValue(mockStream);

      const result = await service.getStream("doc-1");

      expect(smbService.readFileStream).toHaveBeenCalledWith(
        mockDocument.filePath
      );
      expect(result).toBe(mockStream);
    });
  });

  describe("download", () => {
    it("should return file buffer and metadata", async () => {
      const buffer = Buffer.from("file content");
      prismaService.document.findUnique = jest
        .fn()
        .mockResolvedValue(mockDocument);
      smbService.readFile = jest.fn().mockResolvedValue(buffer);

      const result = await service.download("doc-1");

      expect(result.buffer).toBe(buffer);
      expect(result.fileName).toBe("test-document.pdf");
      expect(result.mimeType).toBe("application/pdf");
    });
  });

  describe("archive", () => {
    it("should archive document", async () => {
      const archivedDocument = { ...mockDocument, status: "ARCHIVED" };
      prismaService.document.update = jest
        .fn()
        .mockResolvedValue(archivedDocument);

      const result = await service.archive("doc-1");

      expect(prismaService.document.update).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        data: { status: "ARCHIVED" },
      });
      expect(result.status).toBe("ARCHIVED");
    });
  });

  describe("delete", () => {
    it("should soft delete document", async () => {
      const deletedDocument = { ...mockDocument, status: "DELETED" };
      prismaService.document.update = jest
        .fn()
        .mockResolvedValue(deletedDocument);

      const result = await service.delete("doc-1");

      expect(prismaService.document.update).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        data: { status: "DELETED" },
      });
      expect(result.status).toBe("DELETED");
    });
  });

  describe("search", () => {
    it("should search documents by query", async () => {
      const mockDocuments = [mockDocument];
      prismaService.document.findMany = jest
        .fn()
        .mockResolvedValue(mockDocuments);

      const result = await service.search("test");

      expect(prismaService.document.findMany).toHaveBeenCalledWith({
        where: {
          status: "ACTIVE",
          OR: [
            { name: { contains: "test", mode: "insensitive" } },
            { fileName: { contains: "test", mode: "insensitive" } },
          ],
        },
        include: { folder: true },
        take: 50,
      });
      expect(result).toEqual(mockDocuments);
    });

    it("should search documents in specific folder", async () => {
      const mockDocuments = [mockDocument];
      prismaService.document.findMany = jest
        .fn()
        .mockResolvedValue(mockDocuments);

      const result = await service.search("test", "folder-1");

      expect(prismaService.document.findMany).toHaveBeenCalledWith({
        where: {
          status: "ACTIVE",
          folderId: "folder-1",
          OR: [
            { name: { contains: "test", mode: "insensitive" } },
            { fileName: { contains: "test", mode: "insensitive" } },
          ],
        },
        include: { folder: true },
        take: 50,
      });
      expect(result).toEqual(mockDocuments);
    });
  });

  describe("count", () => {
    it("should return count of active documents", async () => {
      prismaService.document.count = jest.fn().mockResolvedValue(100);

      const result = await service.count();

      expect(result).toBe(100);
      expect(prismaService.document.count).toHaveBeenCalledWith({
        where: { status: "ACTIVE" },
      });
    });
  });

  describe("countRecent", () => {
    it("should return count of recent documents", async () => {
      prismaService.document.count = jest.fn().mockResolvedValue(10);

      const result = await service.countRecent(7);

      expect(result).toBe(10);
      expect(prismaService.document.count).toHaveBeenCalledWith({
        where: {
          status: "ACTIVE",
          createdAt: {
            gte: expect.any(Date),
          },
        },
      });
    });

    it("should use default 7 days when not specified", async () => {
      prismaService.document.count = jest.fn().mockResolvedValue(10);

      await service.countRecent();

      expect(prismaService.document.count).toHaveBeenCalledWith({
        where: {
          status: "ACTIVE",
          createdAt: {
            gte: expect.any(Date),
          },
        },
      });
    });
  });

  describe("getMimeType", () => {
    it("should return correct MIME type for known file types", () => {
      // Access private method through service instance
      const serviceAny = service as unknown as {
        getMimeType: (fileType: string) => string;
      };
      expect(serviceAny.getMimeType("pdf")).toBe("application/pdf");
      expect(serviceAny.getMimeType("docx")).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      expect(serviceAny.getMimeType("xlsx")).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(serviceAny.getMimeType("png")).toBe("image/png");
      expect(serviceAny.getMimeType("jpg")).toBe("image/jpeg");
    });

    it("should return default MIME type for unknown file types", () => {
      const serviceAny = service as unknown as {
        getMimeType: (fileType: string) => string;
      };
      expect(serviceAny.getMimeType("unknown")).toBe(
        "application/octet-stream"
      );
    });
  });
});
