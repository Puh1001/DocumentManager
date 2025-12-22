import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import { SmbService } from "./smb.service";
import { Readable } from "stream";

// Mock fs module
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  promises: {
    access: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
    rm: jest.fn(),
    rename: jest.fn(),
    copyFile: jest.fn(),
  },
  createReadStream: jest.fn(),
  constants: {
    R_OK: 4,
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe("SmbService", () => {
  let service: SmbService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmbService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SmbService>(SmbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should use UNC path on Windows when SMB_USE_MOUNTED_DRIVE is false", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", {
        value: "win32",
        writable: true,
      });

      const mockConfig = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === "SMB_USE_MOUNTED_DRIVE") return false;
          if (key === "SMB_SERVER") return "10.0.60.30";
          if (key === "SMB_SHARE") return "Public";
          if (key === "SMB_BASE_PATH")
            return "IT-Information Technology Dept\\devTest";
          return defaultValue;
        }),
      };

      await Test.createTestingModule({
        providers: [
          SmbService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        writable: true,
      });

      expect(mockConfig.get).toHaveBeenCalledWith(
        "SMB_USE_MOUNTED_DRIVE",
        false
      );
    });

    it("should use mounted drive on Windows when SMB_USE_MOUNTED_DRIVE is true", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", {
        value: "win32",
        writable: true,
      });

      const mockConfig = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === "SMB_USE_MOUNTED_DRIVE") return true;
          if (key === "SMB_MOUNTED_DRIVE") return "Z:";
          if (key === "SMB_SHARE") return "Public";
          if (key === "SMB_BASE_PATH")
            return "IT-Information Technology Dept\\devTest";
          return defaultValue;
        }),
      };

      await Test.createTestingModule({
        providers: [
          SmbService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        writable: true,
      });

      expect(mockConfig.get).toHaveBeenCalledWith(
        "SMB_USE_MOUNTED_DRIVE",
        false
      );
      expect(mockConfig.get).toHaveBeenCalledWith("SMB_MOUNTED_DRIVE", "Z:");
    });

    it("should use mounted path on Linux", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", {
        value: "linux",
        writable: true,
      });

      const mockConfig = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === "SMB_MOUNT_PATH") return "/shared";
          return defaultValue;
        }),
      };

      await Test.createTestingModule({
        providers: [
          SmbService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        writable: true,
      });

      expect(mockConfig.get).toHaveBeenCalledWith("SMB_MOUNT_PATH", "/shared");
    });
  });

  describe("testConnection", () => {
    it("should return true when path is accessible", async () => {
      mockFs.promises.access = jest.fn().mockResolvedValue(undefined);

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockFs.promises.access).toHaveBeenCalled();
    });

    it("should throw error when path is not accessible", async () => {
      const error = new Error("Access denied");
      mockFs.promises.access = jest.fn().mockRejectedValue(error);

      await expect(service.testConnection()).rejects.toThrow("Access denied");
    });
  });

  describe("listDirectory", () => {
    it("should list directory contents", async () => {
      const mockEntries = [
        {
          name: "folder1",
          isDirectory: () => true,
          isFile: () => false,
        },
        {
          name: "file1.pdf",
          isDirectory: () => false,
          isFile: () => true,
        },
      ];

      const mockStats = {
        size: 1024,
        mtime: new Date("2024-01-01"),
      };

      mockFs.promises.readdir = jest.fn().mockResolvedValue(mockEntries);
      mockFs.promises.stat = jest.fn().mockResolvedValue(mockStats);

      const result = await service.listDirectory("test/path");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("folder1");
      expect(result[0].isDirectory).toBe(true);
      expect(result[1].name).toBe("file1.pdf");
      expect(result[1].isDirectory).toBe(false);
      expect(result[1].size).toBe(1024);
    });

    it("should sort directories first, then by name", async () => {
      const mockEntries = [
        { name: "file2.pdf", isDirectory: () => false, isFile: () => true },
        { name: "folder1", isDirectory: () => true, isFile: () => false },
        { name: "file1.pdf", isDirectory: () => false, isFile: () => true },
      ];

      const mockStats = { size: 1024, mtime: new Date() };

      mockFs.promises.readdir = jest.fn().mockResolvedValue(mockEntries);
      mockFs.promises.stat = jest.fn().mockResolvedValue(mockStats);

      const result = await service.listDirectory("");

      expect(result[0].name).toBe("folder1");
      expect(result[1].name).toBe("file1.pdf");
      expect(result[2].name).toBe("file2.pdf");
    });

    it("should throw error when directory does not exist", async () => {
      const error = new Error("ENOENT: no such file or directory");
      mockFs.promises.readdir = jest.fn().mockRejectedValue(error);

      await expect(service.listDirectory("invalid")).rejects.toThrow();
    });
  });

  describe("readFile", () => {
    it("should read file as Buffer", async () => {
      const buffer = Buffer.from("test content");
      mockFs.promises.readFile = jest.fn().mockResolvedValue(buffer);

      const result = await service.readFile("test/file.pdf");

      expect(result).toBe(buffer);
      expect(mockFs.promises.readFile).toHaveBeenCalled();
    });

    it("should throw error when file does not exist", async () => {
      const error = new Error("ENOENT: no such file or directory");
      mockFs.promises.readFile = jest.fn().mockRejectedValue(error);

      await expect(service.readFile("invalid/file.pdf")).rejects.toThrow();
    });
  });

  describe("readFileStream", () => {
    it("should return Readable stream", async () => {
      const mockStream = new Readable();
      mockFs.createReadStream = jest.fn().mockReturnValue(mockStream);

      const result = await service.readFileStream("test/file.pdf");

      expect(result).toBe(mockStream);
      expect(mockFs.createReadStream).toHaveBeenCalled();
    });
  });

  describe("writeFile", () => {
    it("should write file and create directory if needed", async () => {
      const buffer = Buffer.from("test content");
      mockFs.promises.mkdir = jest.fn().mockResolvedValue(undefined);
      mockFs.promises.writeFile = jest.fn().mockResolvedValue(undefined);

      await service.writeFile("test/file.pdf", buffer);

      expect(mockFs.promises.mkdir).toHaveBeenCalled();
      expect(mockFs.promises.writeFile).toHaveBeenCalled();
    });

    it("should throw error when write fails", async () => {
      const buffer = Buffer.from("test content");
      const error = new Error("Permission denied");
      mockFs.promises.mkdir = jest.fn().mockResolvedValue(undefined);
      mockFs.promises.writeFile = jest.fn().mockRejectedValue(error);

      await expect(service.writeFile("test/file.pdf", buffer)).rejects.toThrow(
        "Permission denied"
      );
    });
  });

  describe("createDirectory", () => {
    it("should create directory", async () => {
      mockFs.promises.mkdir = jest.fn().mockResolvedValue(undefined);

      await service.createDirectory("test/folder");

      expect(mockFs.promises.mkdir).toHaveBeenCalled();
    });

    it("should ignore EEXIST error if directory already exists", async () => {
      const error = new Error("EEXIST") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      mockFs.promises.mkdir = jest.fn().mockRejectedValue(error);

      await expect(
        service.createDirectory("existing/folder")
      ).resolves.not.toThrow();
    });

    it("should throw other errors", async () => {
      const error = new Error("Permission denied") as NodeJS.ErrnoException;
      error.code = "EACCES";
      mockFs.promises.mkdir = jest.fn().mockRejectedValue(error);

      await expect(service.createDirectory("test/folder")).rejects.toThrow(
        "Permission denied"
      );
    });
  });

  describe("deleteFile", () => {
    it("should delete file", async () => {
      mockFs.promises.unlink = jest.fn().mockResolvedValue(undefined);

      await service.deleteFile("test/file.pdf");

      expect(mockFs.promises.unlink).toHaveBeenCalled();
    });

    it("should throw error when file does not exist", async () => {
      const error = new Error("ENOENT: no such file or directory");
      mockFs.promises.unlink = jest.fn().mockRejectedValue(error);

      await expect(service.deleteFile("invalid/file.pdf")).rejects.toThrow();
    });
  });

  describe("deleteDirectory", () => {
    it("should delete directory recursively", async () => {
      mockFs.promises.rm = jest.fn().mockResolvedValue(undefined);

      await service.deleteDirectory("test/folder");

      expect(mockFs.promises.rm).toHaveBeenCalledWith(expect.any(String), {
        recursive: true,
        force: true,
      });
    });
  });

  describe("exists", () => {
    it("should return true when path exists", async () => {
      mockFs.promises.access = jest.fn().mockResolvedValue(undefined);

      const result = await service.exists("test/file.pdf");

      expect(result).toBe(true);
    });

    it("should return false when path does not exist", async () => {
      const error = new Error("ENOENT");
      mockFs.promises.access = jest.fn().mockRejectedValue(error);

      const result = await service.exists("invalid/file.pdf");

      expect(result).toBe(false);
    });
  });

  describe("getFileStats", () => {
    it("should return file stats", async () => {
      const mockStats = {
        size: 1024,
        mtime: new Date(),
        birthtime: new Date(),
      } as fs.Stats;

      mockFs.promises.stat = jest.fn().mockResolvedValue(mockStats);

      const result = await service.getFileStats("test/file.pdf");

      expect(result).toBe(mockStats);
      expect(mockFs.promises.stat).toHaveBeenCalled();
    });
  });

  describe("rename", () => {
    it("should rename file or directory", async () => {
      mockFs.promises.rename = jest.fn().mockResolvedValue(undefined);

      await service.rename("old/path", "new/path");

      expect(mockFs.promises.rename).toHaveBeenCalled();
    });
  });

  describe("copyFile", () => {
    it("should copy file and create destination directory", async () => {
      mockFs.promises.mkdir = jest.fn().mockResolvedValue(undefined);
      mockFs.promises.copyFile = jest.fn().mockResolvedValue(undefined);

      await service.copyFile("src/file.pdf", "dest/file.pdf");

      expect(mockFs.promises.mkdir).toHaveBeenCalled();
      expect(mockFs.promises.copyFile).toHaveBeenCalled();
    });
  });
});
