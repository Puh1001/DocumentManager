import { Test, TestingModule } from "@nestjs/testing";
import { DocumentLevelController } from "./document-level.controller";
import { DocumentLevelService } from "../services/document-level.service";
import { PoliciesGuard } from "@/modules/authorization/guards/policies.guard";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";

describe("DocumentLevelController", () => {
  let controller: DocumentLevelController;
  let documentLevelService: jest.Mocked<DocumentLevelService>;

  const mockLevel = {
    id: "level-1",
    code: "LEVEL1",
    name: "Level 1",
    nameEn: "Level 1",
    nameVi: null,
    nameZh: null,
    isActive: true,
    sortOrder: 1,
  };

  const mockPoliciesGuard = { canActivate: jest.fn(() => true) };
  const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const mockDocumentLevelService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentLevelController],
      providers: [
        { provide: DocumentLevelService, useValue: mockDocumentLevelService },
      ],
    })
      .overrideGuard(PoliciesGuard)
      .useValue(mockPoliciesGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<DocumentLevelController>(DocumentLevelController);
    documentLevelService = module.get(DocumentLevelService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return active levels when isActive query is not false", async () => {
      const mockLevels = [mockLevel];
      documentLevelService.findAll = jest.fn().mockResolvedValue(mockLevels);

      const result = await controller.findAll(undefined);

      expect(result).toEqual(mockLevels);
      expect(documentLevelService.findAll).toHaveBeenCalledWith(true);
    });

    it("should return all levels when isActive is false", async () => {
      const mockLevels = [
        mockLevel,
        { ...mockLevel, id: "level-2", isActive: false },
      ];
      documentLevelService.findAll = jest.fn().mockResolvedValue(mockLevels);

      const result = await controller.findAll("false");

      expect(result).toEqual(mockLevels);
      expect(documentLevelService.findAll).toHaveBeenCalledWith(false);
    });
  });
});
