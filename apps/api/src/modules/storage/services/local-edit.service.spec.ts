import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { LocalEditService } from "./local-edit.service";

describe("LocalEditService", () => {
  let service: LocalEditService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "SMB_SERVER") return "10.0.60.30";
        if (key === "SMB_SHARE") return "Public";
        if (key === "SMB_BASE_PATH")
          return "IT-Information Technology Dept\\devTest";
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalEditService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LocalEditService>(LocalEditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getOpenFilePath", () => {
    it("should generate network path for file", () => {
      const result = service.getOpenFilePath("folder/file.pdf");

      expect(result.networkPath).toContain("\\\\10.0.60.30\\Public\\");
      expect(result.networkPath).toContain("folder\\file.pdf");
      expect(result.fileUrl).toContain("file:///");
      expect(result.explorerCommand).toContain('explorer.exe "');
    });

    it("should handle nested paths", () => {
      const result = service.getOpenFilePath("folder/subfolder/document.pdf");

      expect(result.networkPath).toContain("folder\\subfolder\\document.pdf");
    });

    it("should normalize forward slashes to backslashes", () => {
      const result = service.getOpenFilePath("folder/file.pdf");

      expect(result.networkPath).not.toContain("/");
      expect(result.networkPath).toContain("\\");
    });
  });

  describe("getOpenFolderPath", () => {
    it("should generate network path for folder", () => {
      const result = service.getOpenFolderPath("test-folder");

      expect(result.networkPath).toContain("\\\\10.0.60.30\\Public\\");
      expect(result.networkPath).toContain("test-folder");
      expect(result.fileUrl).toContain("file:///");
      expect(result.explorerCommand).toContain('explorer.exe "');
    });

    it("should handle nested folder paths", () => {
      const result = service.getOpenFolderPath("parent/child");

      expect(result.networkPath).toContain("parent\\child");
    });
  });

  describe("configuration", () => {
    it("should use default values when config is not provided", async () => {
      const mockConfigWithDefaults = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          return defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          LocalEditService,
          { provide: ConfigService, useValue: mockConfigWithDefaults },
        ],
      }).compile();

      const serviceWithDefaults =
        module.get<LocalEditService>(LocalEditService);

      const result = serviceWithDefaults.getOpenFilePath("test.pdf");

      expect(result.networkPath).toContain("\\\\10.0.60.30\\Public\\");
    });
  });
});
