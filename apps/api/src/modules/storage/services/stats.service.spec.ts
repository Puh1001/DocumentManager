import { Test, TestingModule } from "@nestjs/testing";
import { StatsService } from "./stats.service";
import { DocumentService } from "./document.service";
import { FolderService } from "./folder.service";
import { UsersService } from "@/modules/users/users.service";

describe("StatsService", () => {
  let service: StatsService;
  let documentService: jest.Mocked<DocumentService>;
  let folderService: jest.Mocked<FolderService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockDocumentService = {
      count: jest.fn(),
      countRecent: jest.fn(),
    };

    const mockFolderService = {
      count: jest.fn(),
    };

    const mockUsersService = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: DocumentService, useValue: mockDocumentService },
        { provide: FolderService, useValue: mockFolderService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    documentService = module.get(DocumentService);
    folderService = module.get(FolderService);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getStats", () => {
    it("should return aggregated statistics", async () => {
      documentService.count = jest.fn().mockResolvedValue(100);
      folderService.count = jest.fn().mockResolvedValue(50);
      usersService.count = jest.fn().mockResolvedValue(25);
      documentService.countRecent = jest.fn().mockResolvedValue(10);

      const result = await service.getStats();

      expect(result).toEqual({
        totalDocuments: 100,
        totalFolders: 50,
        totalUsers: 25,
        recentUploads: 10,
      });
      expect(documentService.count).toHaveBeenCalled();
      expect(folderService.count).toHaveBeenCalled();
      expect(usersService.count).toHaveBeenCalled();
      expect(documentService.countRecent).toHaveBeenCalledWith(7);
    });

    it("should handle zero values", async () => {
      documentService.count = jest.fn().mockResolvedValue(0);
      folderService.count = jest.fn().mockResolvedValue(0);
      usersService.count = jest.fn().mockResolvedValue(0);
      documentService.countRecent = jest.fn().mockResolvedValue(0);

      const result = await service.getStats();

      expect(result).toEqual({
        totalDocuments: 0,
        totalFolders: 0,
        totalUsers: 0,
        recentUploads: 0,
      });
    });
  });
});
