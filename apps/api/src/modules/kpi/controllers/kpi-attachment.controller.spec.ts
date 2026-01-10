import { Test, TestingModule } from "@nestjs/testing";
import { KpiAttachmentController } from "./kpi-attachment.controller";
import { KpiAttachmentService } from "../services/kpi-attachment.service";
import { PoliciesGuard } from "@/modules/authorization/guards/policies.guard";
import { UserDepartmentGuard } from "../guards/user-department.guard";
import { UserDepartmentResolver } from "../services/user-department.resolver";
import { CaslAbilityFactory } from "@/modules/authorization/factories/casl-ability.factory";
import { PrismaService } from "@/common/prisma/prisma.service";
import { Reflector } from "@nestjs/core";
import { UserWithDepartments } from "../services/user-department.resolver";
import { Express } from "express";
import { Readable } from "stream";
import { Response } from "express";

describe("KpiAttachmentController", () => {
  let controller: KpiAttachmentController;
  let service: jest.Mocked<KpiAttachmentService>;

  const mockUser: UserWithDepartments = {
    userId: "user-1",
    departmentIds: ["dept-1"],
    roles: ["editor"],
    isAdmin: false,
    isBoss: false,
    isKpiViewerAll: false,
  };

  const mockAttachment = {
    id: "attachment-1",
    documentId: "doc-1",
    description: "Test attachment",
    createdAt: new Date(),
  };

  const mockAttachmentList = [
    {
      id: "attachment-1",
      documentId: "doc-1",
      fileName: "test.pdf",
      uploadedBy: "Test User",
      createdAt: new Date(),
    },
  ];

  const mockPdfFile: Express.Multer.File = {
    fieldname: "file",
    originalname: "test.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: 1024,
    buffer: Buffer.from("test content"),
    destination: "",
    filename: "",
    path: "",
    stream: null as unknown as Readable,
  };

  const mockPoliciesGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockUserDepartmentGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const mockAttachmentService = {
      uploadAttachment: jest.fn(),
      listAttachments: jest.fn(),
      getStream: jest.fn(),
      download: jest.fn(),
    };

    const mockUserDepartmentResolver = {
      getUserWithDepartments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KpiAttachmentController],
      providers: [
        {
          provide: KpiAttachmentService,
          useValue: mockAttachmentService,
        },
        {
          provide: PoliciesGuard,
          useValue: mockPoliciesGuard,
        },
        {
          provide: UserDepartmentGuard,
          useValue: mockUserDepartmentGuard,
        },
        {
          provide: UserDepartmentResolver,
          useValue: mockUserDepartmentResolver,
        },
        {
          provide: CaslAbilityFactory,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: Reflector,
          useValue: {},
        },
      ],
    })
      .overrideGuard(PoliciesGuard)
      .useValue(mockPoliciesGuard)
      .overrideGuard(UserDepartmentGuard)
      .useValue(mockUserDepartmentGuard)
      .compile();

    controller = module.get<KpiAttachmentController>(
      KpiAttachmentController
    );
    service = module.get(KpiAttachmentService);

    jest.clearAllMocks();
  });

  describe("uploadAttachment", () => {
    it("should upload PDF attachment successfully", async () => {
      service.uploadAttachment = jest
        .fn()
        .mockResolvedValue(mockAttachment);

      const result = await controller.uploadAttachment(
        mockUser,
        "kpi-record-1",
        mockPdfFile,
        { folderId: "folder-1", description: "Test" }
      );

      expect(result).toEqual({
        id: mockAttachment.id,
        documentId: mockAttachment.documentId,
        description: mockAttachment.description,
        createdAt: mockAttachment.createdAt,
      });
      expect(service.uploadAttachment).toHaveBeenCalledWith(
        "kpi-record-1",
        mockPdfFile,
        "folder-1",
        "Test",
        mockUser
      );
    });

    it("should handle upload without description", async () => {
      service.uploadAttachment = jest
        .fn()
        .mockResolvedValue(mockAttachment);

      await controller.uploadAttachment(
        mockUser,
        "kpi-record-1",
        mockPdfFile,
        { folderId: "folder-1" }
      );

      expect(service.uploadAttachment).toHaveBeenCalledWith(
        "kpi-record-1",
        mockPdfFile,
        "folder-1",
        undefined,
        mockUser
      );
    });
  });

  describe("listAttachments", () => {
    it("should return list of attachments", async () => {
      service.listAttachments = jest
        .fn()
        .mockResolvedValue(mockAttachmentList);

      const result = await controller.listAttachments(
        mockUser,
        "kpi-record-1"
      );

      expect(result).toEqual(mockAttachmentList);
      expect(service.listAttachments).toHaveBeenCalledWith(
        "kpi-record-1",
        mockUser
      );
    });

    it("should return empty array if no attachments", async () => {
      service.listAttachments = jest.fn().mockResolvedValue([]);

      const result = await controller.listAttachments(
        mockUser,
        "kpi-record-1"
      );

      expect(result).toEqual([]);
    });
  });

  describe("streamAttachment", () => {
    it("should stream PDF attachment", async () => {
      const mockStream = new Readable();
      mockStream.pipe = jest.fn().mockReturnValue(mockStream);
      const mockResponse = {
        setHeader: jest.fn(),
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      service.getStream = jest.fn().mockResolvedValue(mockStream);

      await controller.streamAttachment(
        mockUser,
        "attachment-1",
        mockResponse
      );

      expect(service.getStream).toHaveBeenCalledWith("attachment-1", mockUser);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf"
      );
      expect(mockStream.pipe).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe("downloadAttachment", () => {
    it("should download PDF attachment", async () => {
      const mockDownloadResult = {
        buffer: Buffer.from("pdf content"),
        fileName: "test.pdf",
        mimeType: "application/pdf",
      };

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      service.download = jest.fn().mockResolvedValue(mockDownloadResult);

      await controller.downloadAttachment(
        mockUser,
        "attachment-1",
        mockResponse
      );

      expect(service.download).toHaveBeenCalledWith("attachment-1", mockUser);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="test.pdf"'
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockDownloadResult.buffer);
    });

    it("should encode filename in Content-Disposition header", async () => {
      const mockDownloadResult = {
        buffer: Buffer.from("pdf content"),
        fileName: "test file with spaces.pdf",
        mimeType: "application/pdf",
      };

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      service.download = jest.fn().mockResolvedValue(mockDownloadResult);

      await controller.downloadAttachment(
        mockUser,
        "attachment-1",
        mockResponse
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("attachment; filename=")
      );
    });
  });
});
