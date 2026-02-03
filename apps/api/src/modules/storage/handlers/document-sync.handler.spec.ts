import { Test, TestingModule } from "@nestjs/testing";
import { DocumentSyncHandler } from "./document-sync.handler";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SmbService } from "../services/smb.service";
import { VersionService } from "../services/version.service";

describe("DocumentSyncHandler", () => {
  let handler: DocumentSyncHandler;
  let prismaService: jest.Mocked<PrismaService>;
  let smbService: jest.Mocked<SmbService>;

  beforeEach(async () => {
    const mockPrismaService = {
      folder: {
        findUnique: jest.fn(),
      },
      document: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      documentLevel: {
        findFirst: jest.fn().mockResolvedValue({
          id: "level-1",
        }),
      },
    };

    const mockSmbService = {
      exists: jest.fn(),
      getFileStats: jest.fn(),
      readFile: jest.fn(),
      listDirectory: jest.fn(),
    };

    const mockVersionService = {
      createVersion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentSyncHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SmbService, useValue: mockSmbService },
        { provide: VersionService, useValue: mockVersionService },
      ],
    }).compile();

    handler = module.get<DocumentSyncHandler>(DocumentSyncHandler);
    prismaService = module.get(PrismaService);
    smbService = module.get(SmbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should skip syncing files under versions folder", async () => {
    await handler.syncDocument(
      {
        name: "v001_2026-02-02T09-08-40-741Z_c38130ee.xls",
        path: "CONG_NGHE/Documents/versions/b853cb94-27c9-4c16-a7fb-53ff7ac2fac8/v001_2026-02-02T09-08-40-741Z_c38130ee.xls",
      },
      null
    );

    expect(smbService.exists).not.toHaveBeenCalled();
    expect(prismaService.document.create).not.toHaveBeenCalled();
  });

  it("should update existing document when file name is {documentId}.ext (current file)", async () => {
    const docId = "0f630d01-3061-4b1c-a6db-7cf79f536678";
    const folderId = "folder-1";
    const filePath =
      "BOC_SOI/ISO_documents/0f630d01-3061-4b1c-a6db-7cf79f536678.xls";
    prismaService.folder.findUnique = jest.fn().mockResolvedValue(null);
    prismaService.document.findFirst = jest
      .fn()
      .mockResolvedValueOnce(null) // no doc by folderId + fileName
      .mockResolvedValueOnce({
        id: docId,
        folderId,
        fileSize: 0,
        fileModifiedAt: null,
      });
    smbService.exists = jest.fn().mockResolvedValue(true);
    smbService.getFileStats = jest.fn().mockResolvedValue({
      size: 1024,
      mtime: new Date("2026-02-03T10:00:00Z"),
    });
    const checksumUtil = await import("../utils/checksum.util");
    const calcSpy = jest.spyOn(checksumUtil.ChecksumUtil, "calculateChecksum");
    calcSpy.mockResolvedValue("abc123");
    prismaService.document.update = jest.fn().mockResolvedValue({});

    await handler.syncDocument(
      { name: `${docId}.xls`, path: filePath, size: 1024 },
      folderId
    );

    expect(prismaService.document.create).not.toHaveBeenCalled();
    expect(prismaService.document.update).toHaveBeenCalledWith({
      where: { id: docId },
      data: expect.objectContaining({
        filePath,
        checksum: "abc123",
        fileSize: 1024,
      }),
    });
    calcSpy.mockRestore();
  });
});
