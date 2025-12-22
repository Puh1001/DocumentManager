import { Test, TestingModule } from "@nestjs/testing";
import { StatsController } from "./stats.controller";
import { StatsService } from "../services/stats.service";

describe("StatsController", () => {
  let controller: StatsController;
  let statsService: jest.Mocked<StatsService>;

  const mockStats = {
    totalDocuments: 100,
    totalFolders: 50,
    totalUsers: 25,
    recentUploads: 10,
  };

  beforeEach(async () => {
    const mockStatsService = {
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [{ provide: StatsService, useValue: mockStatsService }],
    }).compile();

    controller = module.get<StatsController>(StatsController);
    statsService = module.get(StatsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getStats", () => {
    it("should return statistics", async () => {
      statsService.getStats = jest.fn().mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(statsService.getStats).toHaveBeenCalled();
    });
  });
});
