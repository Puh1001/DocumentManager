import { Test, TestingModule } from "@nestjs/testing";
import { KpiRecordService } from "./kpi-record.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { CreateKpiRecordDto } from "../dto/create-kpi-record.dto";
import { UpdateKpiRecordDto } from "../dto/update-kpi-record.dto";

describe("KpiRecordService", () => {
  let service: KpiRecordService;
  let prismaService: jest.Mocked<PrismaService>;

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
      kpiRecord: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KpiRecordService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<KpiRecordService>(KpiRecordService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all KPI records when no filters provided", async () => {
      const mockRecords = [mockKpiRecord];
      prismaService.kpiRecord.findMany = jest
        .fn()
        .mockResolvedValue(mockRecords);

      const result = await service.findAll({});

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

    it("should filter by departmentId when provided", async () => {
      const mockRecords = [mockKpiRecord];
      prismaService.kpiRecord.findMany = jest
        .fn()
        .mockResolvedValue(mockRecords);

      const result = await service.findAll({ departmentId: "dept-1" });

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

      const result = await service.findAll({ year: 2025 });

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

      const result = await service.findAll({
        departmentId: "dept-1",
        year: 2025,
      });

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
  });

  describe("findOne", () => {
    it("should return KPI record by id", async () => {
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(mockKpiRecord);

      const result = await service.findOne("kpi-record-1");

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
        await service.findOne("invalid-id");
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.RECORD_NOT_FOUND
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

      const result = await service.create(dto);

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

      const result = await service.create(dto);

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
        .mockResolvedValue({ id: "kpi-record-1" });
      prismaService.kpiRecord.update = jest
        .fn()
        .mockResolvedValue(updatedRecord);

      const result = await service.update("kpi-record-1", dto);

      expect(result).toEqual(updatedRecord);
      expect(prismaService.kpiRecord.findUnique).toHaveBeenCalledWith({
        where: { id: "kpi-record-1" },
        select: { id: true },
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
        await service.update("invalid-id", dto);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.RECORD_NOT_FOUND
        );
      }
    });
  });

  describe("remove", () => {
    it("should delete KPI record", async () => {
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ id: "kpi-record-1" });
      prismaService.kpiRecord.delete = jest
        .fn()
        .mockResolvedValue(mockKpiRecord);

      const result = await service.remove("kpi-record-1");

      expect(result).toEqual(mockKpiRecord);
      expect(prismaService.kpiRecord.findUnique).toHaveBeenCalledWith({
        where: { id: "kpi-record-1" },
        select: { id: true },
      });
      expect(prismaService.kpiRecord.delete).toHaveBeenCalledWith({
        where: { id: "kpi-record-1" },
      });
    });

    it("should throw CustomException when record does not exist", async () => {
      prismaService.kpiRecord.findUnique = jest.fn().mockResolvedValue(null);

      try {
        await service.remove("invalid-id");
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.RECORD_NOT_FOUND
        );
      }
    });
  });
});
