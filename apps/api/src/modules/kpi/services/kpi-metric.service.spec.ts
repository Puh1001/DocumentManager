import { Test, TestingModule } from "@nestjs/testing";
import { KpiMetricService } from "./kpi-metric.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { CreateKpiMetricDto } from "../dto/create-kpi-metric.dto";
import { UpdateKpiMetricDto } from "../dto/update-kpi-metric.dto";
import { MetricType } from "@prisma/client";
import {
  UserDepartmentResolver,
  UserWithDepartments,
} from "./user-department.resolver";

describe("KpiMetricService", () => {
  let service: KpiMetricService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockAdminUser: UserWithDepartments = {
    userId: "user-1",
    departmentIds: ["dept-1"],
    roles: ["admin"],
    isAdmin: true,
    isBoss: false,
  };

  const mockRegularUser: UserWithDepartments = {
    userId: "user-2",
    departmentIds: ["dept-1"],
    roles: ["editor"],
    isAdmin: false,
    isBoss: false,
  };

  const mockUserNoDept: UserWithDepartments = {
    userId: "user-3",
    departmentIds: [],
    roles: ["editor"],
    isAdmin: false,
    isBoss: false,
  };

  const mockKpiMetric = {
    id: "kpi-metric-1",
    kpiRecordId: "kpi-record-1",
    name: "Test Metric",
    type: MetricType.TARGET,
    sortOrder: 1,
    values: { m1: 100, m2: 200, avg: 150 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      kpiMetric: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      kpiRecord: {
        findUnique: jest.fn(),
      },
    };

    const mockUserDepartmentResolver = {
      getUserWithDepartment: jest.fn(),
      resolveDepartmentId: jest.fn(),
      hasFullAccess: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KpiMetricService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: UserDepartmentResolver,
          useValue: mockUserDepartmentResolver,
        },
      ],
    }).compile();

    service = module.get<KpiMetricService>(KpiMetricService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new KPI metric with values", async () => {
      const dto: CreateKpiMetricDto = {
        kpiRecordId: "kpi-record-1",
        name: "New Metric",
        type: MetricType.TARGET,
        sortOrder: 1,
        values: JSON.stringify({ m1: 100, m2: 200 }),
      };

      const createdMetric = {
        ...mockKpiMetric,
        name: "New Metric",
        values: { m1: 100, m2: 200 },
      };

      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-1" });
      prismaService.kpiMetric.create = jest
        .fn()
        .mockResolvedValue(createdMetric);

      const result = await service.create(dto, mockAdminUser);

      expect(result).toEqual(createdMetric);
      expect(prismaService.kpiMetric.create).toHaveBeenCalledWith({
        data: {
          kpiRecordId: "kpi-record-1",
          name: "New Metric",
          type: MetricType.TARGET,
          sortOrder: 1,
          values: { m1: 100, m2: 200 },
        },
      });
    });

    it("should create KPI metric without values", async () => {
      const dto: CreateKpiMetricDto = {
        kpiRecordId: "kpi-record-1",
        name: "New Metric",
        type: MetricType.ACTUAL,
        sortOrder: 2,
      };

      const createdMetric = {
        ...mockKpiMetric,
        name: "New Metric",
        type: MetricType.ACTUAL,
        sortOrder: 2,
        values: {},
      };

      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-1" });
      prismaService.kpiMetric.create = jest
        .fn()
        .mockResolvedValue(createdMetric);

      const result = await service.create(dto, mockAdminUser);

      expect(result).toEqual(createdMetric);
      expect(prismaService.kpiMetric.create).toHaveBeenCalledWith({
        data: {
          kpiRecordId: "kpi-record-1",
          name: "New Metric",
          type: MetricType.ACTUAL,
          sortOrder: 2,
          values: {},
        },
      });
    });

    it("should throw 403 when regular user creates metric for different department", async () => {
      const dto: CreateKpiMetricDto = {
        kpiRecordId: "kpi-record-1",
        name: "New Metric",
        type: MetricType.TARGET,
        sortOrder: 1,
      };

      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-2" }); // Different department

      try {
        await service.create(dto, mockRegularUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.ACCESS_DENIED_DIFFERENT_DEPARTMENT
        );
      }
    });

    it("should throw 403 when user with no department creates metric", async () => {
      const dto: CreateKpiMetricDto = {
        kpiRecordId: "kpi-record-1",
        name: "New Metric",
        type: MetricType.TARGET,
        sortOrder: 1,
      };

      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-1" });

      try {
        await service.create(dto, mockUserNoDept);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.ACCESS_DENIED_NO_DEPARTMENT
        );
      }
    });
  });

  describe("update", () => {
    it("should update KPI metric", async () => {
      const dto: UpdateKpiMetricDto = {
        name: "Updated Metric",
        type: MetricType.ACTUAL,
        sortOrder: 3,
        values: JSON.stringify({ m1: 150, m2: 250 }),
      };

      const updatedMetric = {
        ...mockKpiMetric,
        name: "Updated Metric",
        type: MetricType.ACTUAL,
        sortOrder: 3,
        values: { m1: 150, m2: 250 },
      };

      prismaService.kpiMetric.findUnique = jest
        .fn()
        .mockResolvedValue({ kpiRecordId: "kpi-record-1" });
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-1" });
      prismaService.kpiMetric.update = jest
        .fn()
        .mockResolvedValue(updatedMetric);

      const result = await service.update("kpi-metric-1", dto, mockAdminUser);

      expect(result).toEqual(updatedMetric);
      expect(prismaService.kpiMetric.findUnique).toHaveBeenCalledWith({
        where: { id: "kpi-metric-1" },
        select: { kpiRecordId: true },
      });
      expect(prismaService.kpiMetric.update).toHaveBeenCalledWith({
        where: { id: "kpi-metric-1" },
        data: {
          name: "Updated Metric",
          type: MetricType.ACTUAL,
          sortOrder: 3,
          values: { m1: 150, m2: 250 },
        },
      });
    });

    it("should update KPI metric without values", async () => {
      const dto: UpdateKpiMetricDto = {
        name: "Updated Metric",
      };

      const updatedMetric = {
        ...mockKpiMetric,
        name: "Updated Metric",
      };

      prismaService.kpiMetric.findUnique = jest
        .fn()
        .mockResolvedValue({ kpiRecordId: "kpi-record-1" });
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-1" });
      prismaService.kpiMetric.update = jest
        .fn()
        .mockResolvedValue(updatedMetric);

      const result = await service.update("kpi-metric-1", dto, mockAdminUser);

      expect(result).toEqual(updatedMetric);
      expect(prismaService.kpiMetric.update).toHaveBeenCalledWith({
        where: { id: "kpi-metric-1" },
        data: {
          name: "Updated Metric",
          type: undefined,
          sortOrder: undefined,
          values: undefined,
        },
      });
    });

    it("should throw CustomException when metric does not exist", async () => {
      const dto: UpdateKpiMetricDto = {
        name: "Updated Metric",
      };

      prismaService.kpiMetric.findUnique = jest.fn().mockResolvedValue(null);

      try {
        await service.update("invalid-id", dto, mockAdminUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.METRIC_NOT_FOUND
        );
      }
    });

    it("should throw 403 when regular user updates metric from different department", async () => {
      const dto: UpdateKpiMetricDto = {
        name: "Updated Metric",
      };

      prismaService.kpiMetric.findUnique = jest
        .fn()
        .mockResolvedValue({ kpiRecordId: "kpi-record-1" });
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-2" }); // Different department

      try {
        await service.update("kpi-metric-1", dto, mockRegularUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.ACCESS_DENIED_DIFFERENT_DEPARTMENT
        );
      }
    });
  });

  describe("remove", () => {
    it("should delete KPI metric", async () => {
      prismaService.kpiMetric.findUnique = jest
        .fn()
        .mockResolvedValue({ kpiRecordId: "kpi-record-1" });
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-1" });
      prismaService.kpiMetric.delete = jest
        .fn()
        .mockResolvedValue(mockKpiMetric);

      const result = await service.remove("kpi-metric-1", mockAdminUser);

      expect(result).toEqual(mockKpiMetric);
      expect(prismaService.kpiMetric.findUnique).toHaveBeenCalledWith({
        where: { id: "kpi-metric-1" },
        select: { kpiRecordId: true },
      });
      expect(prismaService.kpiMetric.delete).toHaveBeenCalledWith({
        where: { id: "kpi-metric-1" },
      });
    });

    it("should throw CustomException when metric does not exist", async () => {
      prismaService.kpiMetric.findUnique = jest.fn().mockResolvedValue(null);

      try {
        await service.remove("invalid-id", mockAdminUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.METRIC_NOT_FOUND
        );
      }
    });

    it("should throw 403 when regular user deletes metric from different department", async () => {
      prismaService.kpiMetric.findUnique = jest
        .fn()
        .mockResolvedValue({ kpiRecordId: "kpi-record-1" });
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ departmentId: "dept-2" }); // Different department

      try {
        await service.remove("kpi-metric-1", mockRegularUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.ACCESS_DENIED_DIFFERENT_DEPARTMENT
        );
      }
    });
  });
});
