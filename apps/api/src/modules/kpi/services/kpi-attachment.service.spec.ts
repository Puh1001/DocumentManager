import { Test, TestingModule } from "@nestjs/testing";
import { KpiAttachmentService } from "./kpi-attachment.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { DocumentService } from "@/modules/storage/services/document.service";
import { UserDepartmentResolver } from "./user-department.resolver";
import { CustomException } from "@/common/errors/custom-exception";
import { UserWithDepartments } from "./user-department.resolver";
import { Express } from "express";
import { Readable } from "stream";

describe("KpiAttachmentService", () => {
  let service: KpiAttachmentService;
  let prismaService: jest.Mocked<PrismaService>;
  let documentService: jest.Mocked<DocumentService>;

  const mockAdminUser: UserWithDepartments = {
    userId: "user-1",
    departmentIds: ["dept-1"],
    roles: ["admin"],
    isAdmin: true,
    isBoss: false,
    isKpiViewerAll: false,
  };

  const mockRegularUser: UserWithDepartments = {
    userId: "user-2",
    departmentIds: ["dept-1"],
    roles: ["editor"],
    isAdmin: false,
    isBoss: false,
    isKpiViewerAll: false,
  };

  const mockUserNoDept: UserWithDepartments = {
    userId: "user-3",
    departmentIds: [],
    roles: ["editor"],
    isAdmin: false,
    isBoss: false,
    isKpiViewerAll: false,
  };

  const mockBossUser: UserWithDepartments = {
    userId: "user-4",
    departmentIds: [],
    roles: ["boss"],
    isAdmin: false,
    isBoss: true,
    isKpiViewerAll: false,
  };

  const mockKpiRecord = {
    id: "kpi-record-1",
    departmentId: "dept-1",
    title: "Test KPI Title",
  };

  const mockDocument = {
    id: "doc-1",
    fileName: "test-attachment.pdf",
    fileType: "pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
  };

  const mockAttachment = {
    id: "attachment-1",
    kpiRecordId: "kpi-record-1",
    documentId: "doc-1",
    description: "Test attachment",
    createdById: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    document: mockDocument,
    createdBy: {
      id: "user-1",
      fullName: "Test User",
    },
  };

  const mockPdfFile: Express.Multer.File = {
    fieldname: "file",
    originalname: "test-attachment.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: 1024,
    buffer: Buffer.from("test pdf content"),
    destination: "",
    filename: "",
    path: "",
    stream: null as unknown as Readable,
  };

  const mockNonPdfFile: Express.Multer.File = {
    ...mockPdfFile,
    originalname: "test-attachment.docx",
    mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  beforeEach(async () => {
    const mockPrismaService = {
      kpiRecord: {
        findUnique: jest.fn(),
      },
      kpiAttachment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const mockDocumentService = {
      upload: jest.fn(),
      getStream: jest.fn(),
      download: jest.fn(),
    };

    const mockUserDepartmentResolver = {
      getUserWithDepartment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KpiAttachmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DocumentService, useValue: mockDocumentService },
        {
          provide: UserDepartmentResolver,
          useValue: mockUserDepartmentResolver,
        },
      ],
    }).compile();

    service = module.get<KpiAttachmentService>(KpiAttachmentService);
    prismaService = module.get(PrismaService);
    documentService = module.get(DocumentService);

    jest.clearAllMocks();
  });

  describe("uploadAttachment", () => {
    it("should successfully create attachment for valid PDF file", async () => {
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(mockKpiRecord);
      documentService.upload = jest.fn().mockResolvedValue(mockDocument);
      prismaService.kpiAttachment.create = jest
        .fn()
        .mockResolvedValue(mockAttachment);
      prismaService.auditLog.create = jest.fn().mockResolvedValue({});

      const result = await service.uploadAttachment(
        "kpi-record-1",
        mockPdfFile,
        "folder-1",
        "Test description",
        mockAdminUser
      );

      expect(result).toEqual(mockAttachment);
      expect(prismaService.kpiRecord.findUnique).toHaveBeenCalledWith({
        where: { id: "kpi-record-1" },
        select: { id: true, departmentId: true, title: true },
      });
      expect(documentService.upload).toHaveBeenCalledWith(
        "folder-1",
        mockPdfFile,
        mockAdminUser.userId,
        mockKpiRecord.title
      );
      expect(prismaService.kpiAttachment.create).toHaveBeenCalled();
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockAdminUser.userId,
          action: "UPLOAD",
          resourceType: "KpiAttachment",
          resourceId: mockAttachment.id,
        }),
      });
    });

    it("should reject non-PDF files", async () => {
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(mockKpiRecord);

      await expect(
        service.uploadAttachment(
          "kpi-record-1",
          mockNonPdfFile,
          "folder-1",
          undefined,
          mockAdminUser
        )
      ).rejects.toThrow(CustomException);

      await expect(
        service.uploadAttachment(
          "kpi-record-1",
          mockNonPdfFile,
          "folder-1",
          undefined,
          mockAdminUser
        )
      ).rejects.toThrow("Only PDF files are allowed for KPI attachments");

      expect(documentService.upload).not.toHaveBeenCalled();
    });

    it("should throw 404 if KPI record not found", async () => {
      prismaService.kpiRecord.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.uploadAttachment(
          "non-existent",
          mockPdfFile,
          "folder-1",
          undefined,
          mockAdminUser
        )
      ).rejects.toThrow(CustomException);

      await expect(
        service.uploadAttachment(
          "non-existent",
          mockPdfFile,
          "folder-1",
          undefined,
          mockAdminUser
        )
      ).rejects.toThrow("KPI record not found");
    });

    it("should throw 400 if file is missing", async () => {
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(mockKpiRecord);

      await expect(
        service.uploadAttachment(
          "kpi-record-1",
          null as unknown as Express.Multer.File,
          "folder-1",
          undefined,
          mockAdminUser
        )
      ).rejects.toThrow(CustomException);

      await expect(
        service.uploadAttachment(
          "kpi-record-1",
          null as unknown as Express.Multer.File,
          "folder-1",
          undefined,
          mockAdminUser
        )
      ).rejects.toThrow("file is required");
    });

    it("should allow boss user to upload to any department", async () => {
      const bossRecord = { ...mockKpiRecord, departmentId: "dept-2" };
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(bossRecord);
      documentService.upload = jest.fn().mockResolvedValue(mockDocument);
      prismaService.kpiAttachment.create = jest
        .fn()
        .mockResolvedValue(mockAttachment);
      prismaService.auditLog.create = jest.fn().mockResolvedValue({});

      await service.uploadAttachment(
        "kpi-record-1",
        mockPdfFile,
        "folder-1",
        undefined,
        mockBossUser
      );

      expect(documentService.upload).toHaveBeenCalled();
    });

    it("should deny access if user not in department", async () => {
      const otherDeptRecord = { ...mockKpiRecord, departmentId: "dept-2" };
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(otherDeptRecord);

      await expect(
        service.uploadAttachment(
          "kpi-record-1",
          mockPdfFile,
          "folder-1",
          undefined,
          mockRegularUser
        )
      ).rejects.toThrow(CustomException);
    });

    it("should deny access if user has no departments", async () => {
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(mockKpiRecord);

      await expect(
        service.uploadAttachment(
          "kpi-record-1",
          mockPdfFile,
          "folder-1",
          undefined,
          mockUserNoDept
        )
      ).rejects.toThrow(CustomException);
    });
  });

  describe("listAttachments", () => {
    it("should return list of attachments for KPI record", async () => {
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(mockKpiRecord);
      prismaService.kpiAttachment.findMany = jest
        .fn()
        .mockResolvedValue([mockAttachment]);

      const result = await service.listAttachments(
        "kpi-record-1",
        mockAdminUser
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockAttachment.id,
        documentId: mockAttachment.documentId,
        fileName: mockDocument.fileName,
        uploadedBy: mockAttachment.createdBy.fullName,
      });
      expect(prismaService.kpiAttachment.findMany).toHaveBeenCalledWith({
        where: { kpiRecordId: "kpi-record-1" },
        include: {
          document: true,
          createdBy: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array if no attachments", async () => {
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(mockKpiRecord);
      prismaService.kpiAttachment.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.listAttachments(
        "kpi-record-1",
        mockAdminUser
      );

      expect(result).toEqual([]);
    });

    it("should throw 404 if KPI record not found", async () => {
      prismaService.kpiRecord.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.listAttachments("non-existent", mockAdminUser)
      ).rejects.toThrow(CustomException);
    });

    it("should deny access if user not in department", async () => {
      const otherDeptRecord = { ...mockKpiRecord, departmentId: "dept-2" };
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(otherDeptRecord);

      await expect(
        service.listAttachments("kpi-record-1", mockRegularUser)
      ).rejects.toThrow(CustomException);
    });
  });

  describe("getStream", () => {
    it("should return stream for attachment", async () => {
      const mockStream = new Readable();
      prismaService.kpiAttachment.findUnique = jest
        .fn()
        .mockResolvedValue({
          ...mockAttachment,
          kpiRecord: { departmentId: "dept-1" },
        });
      documentService.getStream = jest.fn().mockReturnValue(mockStream);
      prismaService.auditLog.create = jest.fn().mockResolvedValue({});

      const result = await service.getStream("attachment-1", mockAdminUser);

      expect(result).toBe(mockStream);
      expect(documentService.getStream).toHaveBeenCalledWith("doc-1");
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockAdminUser.userId,
          action: "VIEW",
          resourceType: "KpiAttachment",
          resourceId: "attachment-1",
        }),
      });
    });

    it("should throw 404 if attachment not found", async () => {
      prismaService.kpiAttachment.findUnique = jest
        .fn()
        .mockResolvedValue(null);

      await expect(
        service.getStream("non-existent", mockAdminUser)
      ).rejects.toThrow(CustomException);
    });

    it("should deny access if user not in department", async () => {
      prismaService.kpiAttachment.findUnique = jest
        .fn()
        .mockResolvedValue({
          ...mockAttachment,
          kpiRecord: { departmentId: "dept-2" },
        });

      await expect(
        service.getStream("attachment-1", mockRegularUser)
      ).rejects.toThrow(CustomException);
    });
  });

  describe("download", () => {
    it("should return download result and log audit", async () => {
      const mockDownloadResult = {
        buffer: Buffer.from("pdf content"),
        fileName: "test-attachment.pdf",
        mimeType: "application/pdf",
      };

      prismaService.kpiAttachment.findUnique = jest
        .fn()
        .mockResolvedValue({
          ...mockAttachment,
          kpiRecord: { departmentId: "dept-1" },
        });
      documentService.download = jest
        .fn()
        .mockResolvedValue(mockDownloadResult);
      prismaService.auditLog.create = jest.fn().mockResolvedValue({});

      const result = await service.download("attachment-1", mockAdminUser);

      expect(result).toEqual(mockDownloadResult);
      expect(documentService.download).toHaveBeenCalledWith("doc-1");
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockAdminUser.userId,
          action: "DOWNLOAD",
          resourceType: "KpiAttachment",
          resourceId: "attachment-1",
        }),
      });
    });

    it("should throw 404 if attachment not found", async () => {
      prismaService.kpiAttachment.findUnique = jest
        .fn()
        .mockResolvedValue(null);

      await expect(
        service.download("non-existent", mockAdminUser)
      ).rejects.toThrow(CustomException);
    });
  });
});
