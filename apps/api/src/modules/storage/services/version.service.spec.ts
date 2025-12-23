import { Test, TestingModule } from "@nestjs/testing";
import { CustomException } from "@/common/errors/custom-exception";
import { VersionService } from "./version.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SmbService } from "./smb.service";

describe("VersionService", () => {
  let service: VersionService;
  let prismaService: jest.Mocked<PrismaService>;
  let smbService: jest.Mocked<SmbService>;

  const mockFolder = {
    id: "folder-1",
    name: "Test Folder",
    path: "test-folder",
  };

  const mockDocument = {
    id: "doc-1",
    fileName: "test-document.pdf",
    folder: mockFolder,
    versions: [],
  };

  const mockVersion = {
    id: "version-1",
    documentId: "doc-1",
    version: 1,
    fileName: "test-document.pdf",
    filePath: "test-folder/versions/doc-1/v001_2024-01-01_user12345.pdf",
    fileSize: 1024,
    checksum: "abc123",
    comment: "Initial upload",
    createdBy: "user-1",
    createdAt: new Date(),
    user: {
      id: "user-1",
      fullName: "Test User",
      email: "test@example.com",
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      document: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      documentVersion: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const mockSmbService = {
      writeFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SmbService, useValue: mockSmbService },
      ],
    }).compile();

    service = module.get<VersionService>(VersionService);
    prismaService = module.get(PrismaService);
    smbService = module.get(SmbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createVersion", () => {
    it("should create first version", async () => {
      const fileData = Buffer.from("test content");

      prismaService.document.findUnique = jest
        .fn()
        .mockResolvedValue(mockDocument);
      smbService.writeFile = jest.fn().mockResolvedValue(undefined);
      prismaService.documentVersion.create = jest
        .fn()
        .mockResolvedValue(mockVersion);
      prismaService.document.update = jest.fn().mockResolvedValue(mockDocument);

      const result = await service.createVersion(
        "doc-1",
        fileData,
        "user-1",
        "Initial upload"
      );

      expect(prismaService.document.findUnique).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        include: {
          folder: true,
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      });
      expect(smbService.writeFile).toHaveBeenCalledTimes(2); // Version file and current file
      expect(prismaService.documentVersion.create).toHaveBeenCalled();
      expect(prismaService.document.update).toHaveBeenCalled();
      expect(result.version).toBe(1);
    });

    it("should create next version incrementally", async () => {
      const fileData = Buffer.from("updated content");
      const documentWithVersion = {
        ...mockDocument,
        versions: [{ version: 1 }],
      };

      prismaService.document.findUnique = jest
        .fn()
        .mockResolvedValue(documentWithVersion);
      smbService.writeFile = jest.fn().mockResolvedValue(undefined);
      prismaService.documentVersion.create = jest.fn().mockResolvedValue({
        ...mockVersion,
        version: 2,
      });
      prismaService.document.update = jest.fn().mockResolvedValue(mockDocument);

      const result = await service.createVersion(
        "doc-1",
        fileData,
        "user-1",
        "Updated version"
      );

      expect(result.version).toBe(2);
    });

    it("should throw NotFoundException when document does not exist", async () => {
      prismaService.document.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.createVersion("invalid-id", Buffer.from("data"), "user-1")
      ).rejects.toThrow(CustomException);
    });
  });

  describe("listVersions", () => {
    it("should return all versions ordered by version desc", async () => {
      const mockVersions = [
        { ...mockVersion, version: 2 },
        { ...mockVersion, version: 1 },
      ];

      prismaService.documentVersion.findMany = jest
        .fn()
        .mockResolvedValue(mockVersions);

      const result = await service.listVersions("doc-1");

      expect(result).toEqual(mockVersions);
      expect(prismaService.documentVersion.findMany).toHaveBeenCalledWith({
        where: { documentId: "doc-1" },
        orderBy: { version: "desc" },
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });
    });
  });

  describe("getVersion", () => {
    it("should return specific version", async () => {
      prismaService.documentVersion.findUnique = jest
        .fn()
        .mockResolvedValue(mockVersion);

      const result = await service.getVersion("doc-1", 1);

      expect(result).toEqual(mockVersion);
      expect(prismaService.documentVersion.findUnique).toHaveBeenCalledWith({
        where: {
          documentId_version: { documentId: "doc-1", version: 1 },
        },
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });
    });

    it("should throw NotFoundException when version does not exist", async () => {
      prismaService.documentVersion.findUnique = jest
        .fn()
        .mockResolvedValue(null);

      await expect(service.getVersion("doc-1", 999)).rejects.toThrow(
        CustomException
      );
    });
  });

  describe("downloadVersion", () => {
    it("should return version file buffer and metadata", async () => {
      const buffer = Buffer.from("version content");
      prismaService.documentVersion.findUnique = jest
        .fn()
        .mockResolvedValue(mockVersion);
      smbService.readFile = jest.fn().mockResolvedValue(buffer);

      const result = await service.downloadVersion("doc-1", 1);

      expect(result.buffer).toBe(buffer);
      expect(result.fileName).toBe("test-document.pdf");
      expect(result.version).toBe(1);
      expect(smbService.readFile).toHaveBeenCalledWith(mockVersion.filePath);
    });
  });

  describe("restoreVersion", () => {
    it("should restore version by creating new version", async () => {
      const fileData = Buffer.from("restored content");
      const restoredVersion = {
        ...mockVersion,
        version: 2,
        comment: "Restored from version 1",
      };

      prismaService.documentVersion.findUnique = jest
        .fn()
        .mockResolvedValue(mockVersion);
      smbService.readFile = jest.fn().mockResolvedValue(fileData);
      prismaService.document.findUnique = jest
        .fn()
        .mockResolvedValue(mockDocument);
      smbService.writeFile = jest.fn().mockResolvedValue(undefined);
      prismaService.documentVersion.create = jest
        .fn()
        .mockResolvedValue(restoredVersion);
      prismaService.document.update = jest.fn().mockResolvedValue(mockDocument);

      const result = await service.restoreVersion("doc-1", 1, "user-1");

      expect(smbService.readFile).toHaveBeenCalledWith(mockVersion.filePath);
      expect(result.version).toBe(2);
      expect(result.comment).toBe("Restored from version 1");
    });
  });
});
