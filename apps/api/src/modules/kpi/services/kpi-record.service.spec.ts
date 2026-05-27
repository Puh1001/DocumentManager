import { Test, TestingModule } from "@nestjs/testing";
import { KpiRecordService } from "./kpi-record.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { CreateKpiRecordDto } from "../dto/create-kpi-record.dto";
import { UpdateKpiRecordDto } from "../dto/update-kpi-record.dto";
import {
  UserDepartmentResolver,
  UserWithDepartments,
} from "./user-department.resolver";
import { KpiAttachmentService } from "./kpi-attachment.service";

describe("KpiRecordService", () => {
  let service: KpiRecordService;
  let prismaService: jest.Mocked<PrismaService>;
  let kpiAttachmentService: jest.Mocked<
    Pick<KpiAttachmentService, "deleteAttachmentsForRecordMonth">
  >;

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

  const mockMultiDeptUser: UserWithDepartments = {
    userId: "user-4",
    departmentIds: ["dept-1", "dept-2", "dept-3"],
    roles: ["editor"],
    isAdmin: false,
    isBoss: false,
    isKpiViewerAll: false,
  };

  const mockKpiRecord = {
    id: "kpi-record-1",
    departmentId: "dept-1",
    year: 2025,
    title: "Test KPI Title",
    target: "≥85%",
    targetValue: 85,
    createdAt: new Date(),
    updatedAt: new Date(),
    department: {
      id: "dept-1",
      name: "Test Department",
      code: "TEST",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    metrics: [],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      department: {
        findUnique: jest.fn(),
      },
      kpiRecord: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      kpiMetric: {
        update: jest.fn(),
      },
      kpiAttachment: {
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };

    const mockKpiAttachmentService = {
      deleteAttachmentsForRecordMonth: jest
        .fn()
        .mockResolvedValue({ deletedCount: 0, failed: [] }),
    };

    const mockUserDepartmentResolver = {
      getUserWithDepartment: jest.fn(),
      resolveDepartmentId: jest.fn(),
      hasFullAccess: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KpiRecordService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: UserDepartmentResolver,
          useValue: mockUserDepartmentResolver,
        },
        {
          provide: KpiAttachmentService,
          useValue: mockKpiAttachmentService,
        },
      ],
    }).compile();

    service = module.get<KpiRecordService>(KpiRecordService);
    prismaService = module.get(PrismaService);
    kpiAttachmentService = module.get(KpiAttachmentService);

    // Default: departments are in KPI scope
    prismaService.department.findUnique = jest
      .fn()
      .mockResolvedValue({ code: "TEST" });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all KPI records for admin user", async () => {
      const mockRecords = [mockKpiRecord];
      prismaService.kpiRecord.findMany = jest
        .fn()
        .mockResolvedValue(mockRecords);

      const result = await service.findAll({}, mockAdminUser);

      expect(result).toEqual(mockRecords);
      expect(prismaService.kpiRecord.findMany).toHaveBeenCalledWith({
        where: {
          departmentId: undefined,
          year: undefined,
        },
        include: {
          department: true,
          metrics: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter by departmentId for admin user", async () => {
      const mockRecords = [mockKpiRecord];
      prismaService.kpiRecord.findMany = jest
        .fn()
        .mockResolvedValue(mockRecords);

      const result = await service.findAll(
        { departmentId: "dept-1" },
        mockAdminUser,
      );

      expect(result).toEqual(mockRecords);
      expect(prismaService.kpiRecord.findMany).toHaveBeenCalledWith({
        where: {
          departmentId: "dept-1",
          year: undefined,
        },
        include: {
          department: true,
          metrics: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter by year when provided", async () => {
      const mockRecords = [mockKpiRecord];
      prismaService.kpiRecord.findMany = jest
        .fn()
        .mockResolvedValue(mockRecords);

      const result = await service.findAll({ year: 2025 }, mockAdminUser);

      expect(result).toEqual(mockRecords);
      expect(prismaService.kpiRecord.findMany).toHaveBeenCalledWith({
        where: {
          departmentId: undefined,
          year: 2025,
        },
        include: {
          department: true,
          metrics: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter by both departmentId and year when provided", async () => {
      const mockRecords = [mockKpiRecord];
      prismaService.kpiRecord.findMany = jest
        .fn()
        .mockResolvedValue(mockRecords);

      const result = await service.findAll(
        {
          departmentId: "dept-1",
          year: 2025,
        },
        mockAdminUser,
      );

      expect(result).toEqual(mockRecords);
      expect(prismaService.kpiRecord.findMany).toHaveBeenCalledWith({
        where: {
          departmentId: "dept-1",
          year: 2025,
        },
        include: {
          department: true,
          metrics: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter by user's departments for regular user", async () => {
      const mockRecords = [mockKpiRecord];
      prismaService.kpiRecord.findMany = jest
        .fn()
        .mockResolvedValue(mockRecords);

      const result = await service.findAll({}, mockRegularUser);

      expect(result).toEqual(mockRecords);
      expect(prismaService.kpiRecord.findMany).toHaveBeenCalledWith({
        where: {
          departmentId: { in: ["dept-1"] }, // User's departments array
          year: undefined,
        },
        include: {
          department: true,
          metrics: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array for user with no department", async () => {
      const result = await service.findAll({}, mockUserNoDept);

      expect(result).toEqual([]);
      expect(prismaService.kpiRecord.findMany).not.toHaveBeenCalled();
    });

    it("should filter by multiple departments for multi-dept user", async () => {
      const mockRecords = [mockKpiRecord];
      prismaService.kpiRecord.findMany = jest
        .fn()
        .mockResolvedValue(mockRecords);

      const result = await service.findAll({}, mockMultiDeptUser);

      expect(result).toEqual(mockRecords);
      expect(prismaService.kpiRecord.findMany).toHaveBeenCalledWith({
        where: {
          departmentId: { in: ["dept-1", "dept-2", "dept-3"] },
          year: undefined,
        },
        include: {
          department: true,
          metrics: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter by specific department if user has access", async () => {
      const mockRecords = [mockKpiRecord];
      prismaService.kpiRecord.findMany = jest
        .fn()
        .mockResolvedValue(mockRecords);

      const result = await service.findAll(
        { departmentId: "dept-2" },
        mockMultiDeptUser,
      );

      expect(result).toEqual(mockRecords);
      expect(prismaService.kpiRecord.findMany).toHaveBeenCalledWith({
        where: {
          departmentId: "dept-2", // Specific department user has access to
          year: undefined,
        },
        include: {
          department: true,
          metrics: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("findOne", () => {
    it("should return KPI record by id", async () => {
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(mockKpiRecord);

      const result = await service.findOne("kpi-record-1", mockAdminUser);

      expect(result).toEqual(mockKpiRecord);
      expect(prismaService.kpiRecord.findUnique).toHaveBeenCalledWith({
        where: { id: "kpi-record-1" },
        include: {
          department: true,
          metrics: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    });

    it("should throw CustomException when record does not exist", async () => {
      prismaService.kpiRecord.findUnique = jest.fn().mockResolvedValue(null);

      try {
        await service.findOne("invalid-id", mockAdminUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.RECORD_NOT_FOUND,
        );
      }
    });

    it("should throw 403 when regular user accesses different department", async () => {
      const differentDeptRecord = {
        ...mockKpiRecord,
        departmentId: "dept-2",
      };
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(differentDeptRecord);

      try {
        await service.findOne("kpi-record-1", mockRegularUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.ACCESS_DENIED_DIFFERENT_DEPARTMENT,
        );
      }
    });
  });

  describe("create", () => {
    it("should create a new KPI record", async () => {
      const dto: CreateKpiRecordDto = {
        departmentId: "dept-1",
        year: 2025,
        title: "New KPI Title",
        target: "≥90%",
        targetValue: 90,
      };

      const createdRecord = {
        ...mockKpiRecord,
        title: "New KPI Title",
        target: "≥90%",
        targetValue: 90,
      };

      prismaService.kpiRecord.create = jest
        .fn()
        .mockResolvedValue(createdRecord);

      prismaService.department.findUnique = jest
        .fn()
        .mockResolvedValue({ code: "TEST" });

      const result = await service.create(dto, mockAdminUser);

      expect(result).toEqual(createdRecord);
      expect(prismaService.kpiRecord.create).toHaveBeenCalledWith({
        data: {
          departmentId: "dept-1",
          year: 2025,
          title: "New KPI Title",
          target: "≥90%",
          targetValue: 90,
        },
      });
    });

    it("should create KPI record without targetValue", async () => {
      const dto: CreateKpiRecordDto = {
        departmentId: "dept-1",
        year: 2025,
        title: "New KPI Title",
        target: "≥90%",
      };

      const createdRecord = {
        ...mockKpiRecord,
        title: "New KPI Title",
        target: "≥90%",
        targetValue: null,
      };

      prismaService.kpiRecord.create = jest
        .fn()
        .mockResolvedValue(createdRecord);

      prismaService.department.findUnique = jest
        .fn()
        .mockResolvedValue({ code: "TEST" });

      const result = await service.create(dto, mockAdminUser);

      expect(result).toEqual(createdRecord);
      expect(prismaService.kpiRecord.create).toHaveBeenCalledWith({
        data: {
          departmentId: "dept-1",
          year: 2025,
          title: "New KPI Title",
          target: "≥90%",
          targetValue: undefined,
        },
      });
    });

    it("should throw 403 when regular user creates KPI for different department", async () => {
      const dto: CreateKpiRecordDto = {
        departmentId: "dept-2", // Different from user's department
        year: 2025,
        title: "New KPI Title",
        target: "≥90%",
        targetValue: 90,
      };

      prismaService.department.findUnique = jest
        .fn()
        .mockResolvedValue({ code: "TEST" });

      try {
        await service.create(dto, mockRegularUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.DEPARTMENT_MISMATCH,
        );
      }
    });

    it("should throw 403 when user with no department creates KPI", async () => {
      const dto: CreateKpiRecordDto = {
        departmentId: "dept-1",
        year: 2025,
        title: "New KPI Title",
        target: "≥90%",
      };

      prismaService.department.findUnique = jest
        .fn()
        .mockResolvedValue({ code: "TEST" });

      try {
        await service.create(dto, mockUserNoDept);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.ACCESS_DENIED_NO_DEPARTMENT,
        );
      }
    });

    it("should throw 403 when creating KPI for out-of-scope department code", async () => {
      const dto: CreateKpiRecordDto = {
        departmentId: "dept-ac",
        year: 2025,
        title: "Should not be allowed",
        target: "N/A",
      };

      prismaService.department.findUnique = jest
        .fn()
        .mockResolvedValue({ code: "AC" });

      try {
        await service.create(dto, mockAdminUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.ACCESS_DENIED,
        );
      }
    });
  });

  describe("update", () => {
    it("should update KPI record", async () => {
      const dto: UpdateKpiRecordDto = {
        title: "Updated Title",
        target: "≥95%",
        targetValue: 95,
      };

      const updatedRecord = {
        ...mockKpiRecord,
        title: "Updated Title",
        target: "≥95%",
        targetValue: 95,
      };

      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-1" });
      prismaService.kpiRecord.update = jest
        .fn()
        .mockResolvedValue(updatedRecord);

      const result = await service.update("kpi-record-1", dto, mockAdminUser);

      expect(result).toEqual(updatedRecord);
      expect(prismaService.kpiRecord.findUnique).toHaveBeenCalledWith({
        where: { id: "kpi-record-1" },
        select: { departmentId: true },
      });
      expect(prismaService.kpiRecord.update).toHaveBeenCalledWith({
        where: { id: "kpi-record-1" },
        data: {
          departmentId: undefined,
          year: undefined,
          title: "Updated Title",
          target: "≥95%",
          targetValue: 95,
        },
      });
    });

    it("should throw CustomException when record does not exist", async () => {
      const dto: UpdateKpiRecordDto = {
        title: "Updated Title",
      };

      prismaService.kpiRecord.findUnique = jest.fn().mockResolvedValue(null);

      try {
        await service.update("invalid-id", dto, mockAdminUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.RECORD_NOT_FOUND,
        );
      }
    });

    it("should throw 403 when regular user updates different department's KPI", async () => {
      const dto: UpdateKpiRecordDto = {
        title: "Updated Title",
      };

      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-2" }); // Different department

      try {
        await service.update("kpi-record-1", dto, mockRegularUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.ACCESS_DENIED_DIFFERENT_DEPARTMENT,
        );
      }
    });
  });

  describe("clearMonth", () => {
    it("should clear attachments and metric values for one month only", async () => {
      prismaService.kpiRecord.findUnique = jest.fn().mockResolvedValue({
        id: "kpi-record-1",
        departmentId: "dept-1",
        status: "COMPLETED",
        metrics: [
          { id: "metric-1", values: { m1: 10, m5: 20 } },
          { id: "metric-2", values: { m5: 30 } },
        ],
      });
      prismaService.kpiMetric.update = jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ values: data.values }));
      prismaService.kpiAttachment.count = jest.fn().mockResolvedValue(1);
      prismaService.auditLog.create = jest.fn().mockResolvedValue({});

      kpiAttachmentService.deleteAttachmentsForRecordMonth.mockResolvedValue({
        deletedCount: 2,
        failed: [],
      });

      const result = await service.clearMonth("kpi-record-1", 5, mockAdminUser);

      expect(result.month).toBe(5);
      expect(result.attachmentsDeleted).toBe(2);
      expect(kpiAttachmentService.deleteAttachmentsForRecordMonth).toHaveBeenCalledWith(
        "kpi-record-1",
        5,
        mockAdminUser,
      );
      expect(prismaService.kpiMetric.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "metric-1" },
          data: { values: { m1: 10, m5: null } },
        }),
      );
      expect(prismaService.kpiRecord.delete).not.toHaveBeenCalled();
    });

    it("should reject invalid month", async () => {
      try {
        await service.clearMonth("kpi-record-1", 13, mockAdminUser);
        fail("Expected CustomException");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.INVALID_INPUT,
        );
      }
    });
  });

  describe("remove", () => {
    it("should delete KPI record", async () => {
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-1" });
      prismaService.kpiRecord.delete = jest
        .fn()
        .mockResolvedValue(mockKpiRecord);

      const result = await service.remove("kpi-record-1", mockAdminUser);

      expect(result).toEqual(mockKpiRecord);
      expect(prismaService.kpiRecord.findUnique).toHaveBeenCalledWith({
        where: { id: "kpi-record-1" },
        select: { departmentId: true },
      });
      expect(prismaService.kpiRecord.delete).toHaveBeenCalledWith({
        where: { id: "kpi-record-1" },
      });
    });

    it("should throw CustomException when record does not exist", async () => {
      prismaService.kpiRecord.findUnique = jest.fn().mockResolvedValue(null);

      try {
        await service.remove("invalid-id", mockAdminUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.RECORD_NOT_FOUND,
        );
      }
    });

    it("should throw 403 when regular user deletes different department's KPI", async () => {
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-2" }); // Different department

      try {
        await service.remove("kpi-record-1", mockRegularUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.ACCESS_DENIED_DIFFERENT_DEPARTMENT,
        );
      }
    });
  });
});
