import { Test, TestingModule } from "@nestjs/testing";
import { KpiMetricService } from "./kpi-metric.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { CreateKpiMetricDto } from "../dto/create-kpi-metric.dto";
import { UpdateKpiMetricDto } from "../dto/update-kpi-metric.dto";
import { MetricType } from "@prisma/client";

describe("KpiMetricService", () => {
  let service: KpiMetricService;
  let prismaService: jest.Mocked<PrismaService>;

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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KpiMetricService,
        { provide: PrismaService, useValue: mockPrismaService },
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

      prismaService.kpiMetric.create = jest
        .fn()
        .mockResolvedValue(createdMetric);

      const result = await service.create(dto);

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

      prismaService.kpiMetric.create = jest
        .fn()
        .mockResolvedValue(createdMetric);

      const result = await service.create(dto);

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
        .mockResolvedValue({ id: "kpi-metric-1" });
      prismaService.kpiMetric.update = jest
        .fn()
        .mockResolvedValue(updatedMetric);

      const result = await service.update("kpi-metric-1", dto);

      expect(result).toEqual(updatedMetric);
      expect(prismaService.kpiMetric.findUnique).toHaveBeenCalledWith({
        where: { id: "kpi-metric-1" },
        select: { id: true },
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
        .mockResolvedValue({ id: "kpi-metric-1" });
      prismaService.kpiMetric.update = jest
        .fn()
        .mockResolvedValue(updatedMetric);

      const result = await service.update("kpi-metric-1", dto);

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
        await service.update("invalid-id", dto);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.METRIC_NOT_FOUND
        );
      }
    });
  });

  describe("remove", () => {
    it("should delete KPI metric", async () => {
      prismaService.kpiMetric.findUnique = jest
        .fn()
        .mockResolvedValue({ id: "kpi-metric-1" });
      prismaService.kpiMetric.delete = jest
        .fn()
        .mockResolvedValue(mockKpiMetric);

      const result = await service.remove("kpi-metric-1");

      expect(result).toEqual(mockKpiMetric);
      expect(prismaService.kpiMetric.findUnique).toHaveBeenCalledWith({
        where: { id: "kpi-metric-1" },
        select: { id: true },
      });
      expect(prismaService.kpiMetric.delete).toHaveBeenCalledWith({
        where: { id: "kpi-metric-1" },
      });
    });

    it("should throw CustomException when metric does not exist", async () => {
      prismaService.kpiMetric.findUnique = jest.fn().mockResolvedValue(null);

      try {
        await service.remove("invalid-id");
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.METRIC_NOT_FOUND
        );
      }
    });
  });
});

