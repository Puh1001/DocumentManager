import { Test, TestingModule } from "@nestjs/testing";
import { Readable } from "stream";
import { Express } from "express";
import { ClientService, type ListClientFilesResult } from "./client.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { FolderService } from "@/modules/storage/services/folder.service";
import { DocumentLevelService } from "@/modules/storage/services/document-level.service";
import { VersionService } from "@/modules/storage/services/version.service";
import { DocumentService } from "@/modules/storage/services/document.service";
import { CustomException } from "@/common/errors/custom-exception";

describe("ClientService", () => {
  let service: ClientService;
  let prisma: jest.Mocked<PrismaService>;
  let folderService: jest.Mocked<FolderService>;
  let documentLevelService: jest.Mocked<DocumentLevelService>;
  let versionService: jest.Mocked<VersionService>;
  let documentService: jest.Mocked<DocumentService>;

  beforeEach(async () => {
    const mockPrisma: Partial<jest.Mocked<PrismaService>> = {
      document: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
      } as unknown as jest.Mocked<PrismaService>["document"],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: FolderService,
          useValue: {
            ensureClientFolder: jest.fn(),
          },
        },
        {
          provide: DocumentLevelService,
          useValue: {
            findByCode: jest.fn(),
          },
        },
        {
          provide: VersionService,
          useValue: {
            createVersion: jest.fn(),
          },
        },
        {
          provide: DocumentService,
          useValue: {
            delete: jest.fn(),
            getStream: jest.fn(),
            deletePhysicalFilesFromStorage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ClientService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    folderService = module.get(FolderService) as jest.Mocked<FolderService>;
    documentLevelService = module.get(
      DocumentLevelService,
    ) as jest.Mocked<DocumentLevelService>;
    versionService = module.get(VersionService) as jest.Mocked<VersionService>;
    documentService = module.get(
      DocumentService,
    ) as jest.Mocked<DocumentService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should list client documents with filters", async () => {
      (folderService.ensureClientFolder as jest.Mock).mockResolvedValue({
        clientFolderId: "client-folder",
      });

      const now = new Date();
      const docs = [
        {
          id: "doc-1",
          name: "File 1",
          fileName: "file1.pdf",
          fileType: "pdf",
          fileSize: 1234,
          uploadedBy: "user-1",
          uploadedAt: now,
          createdAt: now,
        },
      ];

      (prisma.document.findMany as jest.Mock).mockResolvedValue(docs);
      (prisma.document.count as jest.Mock).mockResolvedValue(1);

      const result = await service.list({
        search: " test ",
        fileType: ".pdf",
        dateFrom: "2026-02-01",
        dateTo: "2026-02-10",
        page: 1,
        limit: 10,
      });

      expect(folderService.ensureClientFolder).toHaveBeenCalled();
      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            folderId: "client-folder",
            status: "ACTIVE",
            fileType: "pdf",
            OR: [
              { name: { contains: "test", mode: "insensitive" } },
              { fileName: { contains: "test", mode: "insensitive" } },
            ],
          }),
          skip: 0,
          take: 10,
        }),
      );
      expect(result).toEqual<ListClientFilesResult>({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: "doc-1",
            fileType: "pdf",
            fileSize: 1234,
          }),
        ]),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe("upload", () => {
    const baseFile: Partial<Express.Multer.File> = {
      buffer: Buffer.from("test"),
      originalname: "test.pdf",
      size: 1024,
    };

    it("should throw when file buffer is missing", async () => {
      await expect(
        service.upload({ size: 0 } as Express.Multer.File, "user-1"),
      ).rejects.toThrow(CustomException);
    });

    it("should throw when file is too large", async () => {
      const bigFile: Express.Multer.File = {
        ...(baseFile as Express.Multer.File),
        size: 101 * 1024 * 1024,
      };

      await expect(service.upload(bigFile, "user-1")).rejects.toThrow(
        CustomException,
      );
    });

    it("should throw when extension is not allowed", async () => {
      const badFile: Express.Multer.File = {
        ...(baseFile as Express.Multer.File),
        originalname: "notes.txt",
      };

      await expect(service.upload(badFile, "user-1")).rejects.toThrow(
        CustomException,
      );
    });

    it("should upload document to Client folder and create version", async () => {
      const file: Express.Multer.File = {
        ...(baseFile as Express.Multer.File),
        originalname: "Tài liệu khách hàng.pdf",
      };

      (folderService.ensureClientFolder as jest.Mock).mockResolvedValue({
        clientFolderId: "client-folder",
      });

      (prisma.document.create as jest.Mock).mockResolvedValue({
        id: "doc-1",
      });
      (prisma.document.findUnique as jest.Mock).mockResolvedValue({
        id: "doc-1",
        name: "Tài liệu khách hàng",
        fileName: "Tài liệu khách hàng.pdf",
        fileType: "pdf",
      });
      (versionService.createVersion as jest.Mock).mockResolvedValue({
        id: "version-1",
      });

      const result = await service.upload(file, "user-1");

      expect(folderService.ensureClientFolder).toHaveBeenCalled();
      expect(documentLevelService.findByCode).not.toHaveBeenCalled();
      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          levelId: null, // Client files don't require a level
        }),
      });
      expect(versionService.createVersion).toHaveBeenCalledWith(
        "doc-1",
        file.buffer,
        "user-1",
        "Client upload",
      );
      expect(result).toEqual({
        id: "doc-1",
        name: expect.any(String),
        fileName: expect.any(String),
        fileType: "pdf",
      });
    });
  });

  describe("delete", () => {
    it("should delete document in Client folder", async () => {
      (folderService.ensureClientFolder as jest.Mock).mockResolvedValue({
        clientFolderId: "client-folder",
      });
      (prisma.document.findUnique as jest.Mock).mockResolvedValue({
        id: "doc-1",
        folderId: "client-folder",
      });

      await service.delete("doc-1", "user-1");

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        include: { folder: true },
      });
      expect(documentService.delete).toHaveBeenCalledWith("doc-1");
      expect(
        documentService.deletePhysicalFilesFromStorage,
      ).toHaveBeenCalledWith("doc-1");
    });

    it("should throw when document is not in Client folder", async () => {
      (folderService.ensureClientFolder as jest.Mock).mockResolvedValue({
        clientFolderId: "client-folder",
      });
      (prisma.document.findUnique as jest.Mock).mockResolvedValue({
        id: "doc-1",
        folderId: "other-folder",
      });

      await expect(service.delete("doc-1", "user-1")).rejects.toThrow(
        CustomException,
      );
      expect(documentService.delete).not.toHaveBeenCalled();
    });
  });

  describe("getStream", () => {
    it("should return stream for document in Client folder", async () => {
      (folderService.ensureClientFolder as jest.Mock).mockResolvedValue({
        clientFolderId: "client-folder",
      });
      (prisma.document.findUnique as jest.Mock).mockResolvedValue({
        id: "doc-1",
        folderId: "client-folder",
        fileType: "pdf",
      });

      const stream = { pipe: jest.fn() } as unknown as Readable;
      (documentService.getStream as jest.Mock).mockResolvedValue(stream);

      const result = await service.getStream("doc-1");

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        select: { id: true, folderId: true, fileType: true },
      });
      expect(documentService.getStream).toHaveBeenCalledWith("doc-1");
      expect(result).toEqual({
        stream,
        fileType: "pdf",
      });
    });

    it("should throw when document is not in Client folder", async () => {
      (folderService.ensureClientFolder as jest.Mock).mockResolvedValue({
        clientFolderId: "client-folder",
      });
      (prisma.document.findUnique as jest.Mock).mockResolvedValue({
        id: "doc-1",
        folderId: "other-folder",
        fileType: "pdf",
      });

      await expect(service.getStream("doc-1")).rejects.toThrow(
        CustomException,
      );
      expect(documentService.getStream).not.toHaveBeenCalled();
    });
  });
});

