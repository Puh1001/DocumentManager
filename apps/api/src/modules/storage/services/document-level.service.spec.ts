import { Test, TestingModule } from "@nestjs/testing";
import { DocumentLevelService } from "./document-level.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";

describe("DocumentLevelService", () => {
  let service: DocumentLevelService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockLevel = {
    id: "level-1",
    code: "LEVEL1",
    name: "Level 1",
    nameEn: "Level 1",
    nameVi: null,
    nameZh: null,
    description: null,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      documentLevel: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentLevelService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DocumentLevelService>(DocumentLevelService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return active levels only when activeOnly is true (default)", async () => {
      const mockLevels = [mockLevel];
      prismaService.documentLevel.findMany = jest
        .fn()
        .mockResolvedValue(mockLevels);

      const result = await service.findAll();

      expect(result).toEqual(mockLevels);
      expect(prismaService.documentLevel.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    });

    it("should return all levels when activeOnly is false", async () => {
      const mockLevels = [
        mockLevel,
        { ...mockLevel, id: "level-2", isActive: false },
      ];
      prismaService.documentLevel.findMany = jest
        .fn()
        .mockResolvedValue(mockLevels);

      const result = await service.findAll(false);

      expect(result).toEqual(mockLevels);
      expect(prismaService.documentLevel.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { sortOrder: "asc" },
      });
    });
  });

  describe("findById", () => {
    it("should return level by id", async () => {
      prismaService.documentLevel.findUnique = jest
        .fn()
        .mockResolvedValue(mockLevel);

      const result = await service.findById("level-1");

      expect(result).toEqual(mockLevel);
      expect(prismaService.documentLevel.findUnique).toHaveBeenCalledWith({
        where: { id: "level-1" },
      });
    });

    it("should return null when level does not exist", async () => {
      prismaService.documentLevel.findUnique = jest
        .fn()
        .mockResolvedValue(null);

      const result = await service.findById("invalid-id");

      expect(result).toBeNull();
    });
  });

  describe("findByCode", () => {
    it("should return level by code", async () => {
      prismaService.documentLevel.findUnique = jest
        .fn()
        .mockResolvedValue(mockLevel);

      const result = await service.findByCode("LEVEL1");

      expect(result).toEqual(mockLevel);
      expect(prismaService.documentLevel.findUnique).toHaveBeenCalledWith({
        where: { code: "LEVEL1" },
      });
    });
  });
});
