import { Test, TestingModule } from "@nestjs/testing";
import { HttpException, HttpStatus } from "@nestjs/common";
import { FolderController } from "./folder.controller";
import { FolderService, FolderTreeNode } from "../services/folder.service";
import { FolderSyncService } from "../services/folder-sync.service";
import { LocalEditService } from "../services/local-edit.service";
import { CreateFolderDto } from "../dto/create-folder.dto";
import { UpdateFolderDto } from "../dto/update-folder.dto";

describe("FolderController", () => {
  let controller: FolderController;
  let folderService: jest.Mocked<FolderService>;
  let folderSyncService: jest.Mocked<FolderSyncService>;
  let localEditService: jest.Mocked<LocalEditService>;

  const mockFolder = {
    id: "folder-1",
    name: "Test Folder",
    path: "test-folder",
    parentId: null,
    physicalLocation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      children: 0,
      documents: 0,
    },
  };

  const mockTree: FolderTreeNode[] = [
    {
      id: "folder-1",
      name: "Root",
      path: "root",
      physicalLocation: null,
      documentCount: 5,
      children: [],
    },
  ];

  beforeEach(async () => {
    const mockFolderService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getTree: jest.fn(),
    };

    const mockFolderSyncService = {
      syncWithFileSystem: jest.fn(),
    };

    const mockLocalEditService = {
      getOpenFolderPath: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FolderController],
      providers: [
        { provide: FolderService, useValue: mockFolderService },
        { provide: FolderSyncService, useValue: mockFolderSyncService },
        { provide: LocalEditService, useValue: mockLocalEditService },
      ],
    }).compile();

    controller = module.get<FolderController>(FolderController);
    folderService = module.get(FolderService);
    folderSyncService = module.get(FolderSyncService);
    localEditService = module.get(LocalEditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all folders", async () => {
      const mockFolders = [mockFolder];
      folderService.findAll = jest.fn().mockResolvedValue(mockFolders);

      const result = await controller.findAll();

      expect(result).toEqual(mockFolders);
      expect(folderService.findAll).toHaveBeenCalledWith(undefined);
    });

    it("should return folders with parentId filter", async () => {
      const mockFolders = [mockFolder];
      folderService.findAll = jest.fn().mockResolvedValue(mockFolders);

      const result = await controller.findAll("parent-1");

      expect(result).toEqual(mockFolders);
      expect(folderService.findAll).toHaveBeenCalledWith("parent-1");
    });
  });

  describe("getTree", () => {
    it("should return folder tree structure", async () => {
      folderService.getTree = jest.fn().mockResolvedValue(mockTree);

      const result = await controller.getTree();

      expect(result).toEqual(mockTree);
      expect(folderService.getTree).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return folder by id", async () => {
      folderService.findById = jest.fn().mockResolvedValue(mockFolder);

      const result = await controller.findOne("folder-1");

      expect(result).toEqual(mockFolder);
      expect(folderService.findById).toHaveBeenCalledWith("folder-1");
    });
  });

  describe("create", () => {
    it("should create new folder", async () => {
      const dto: CreateFolderDto = {
        name: "New Folder",
        parentId: undefined,
        physicalLocation: undefined,
      };

      folderService.create = jest.fn().mockResolvedValue({
        ...mockFolder,
        name: "New Folder",
      });

      const result = await controller.create(dto);

      expect(result.name).toBe("New Folder");
      expect(folderService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe("update", () => {
    it("should update folder", async () => {
      const dto: UpdateFolderDto = {
        name: "Updated Folder",
      };

      folderService.update = jest.fn().mockResolvedValue({
        ...mockFolder,
        name: "Updated Folder",
      });

      const result = await controller.update("folder-1", dto);

      expect(result.name).toBe("Updated Folder");
      expect(folderService.update).toHaveBeenCalledWith("folder-1", dto);
    });
  });

  describe("remove", () => {
    it("should delete folder", async () => {
      folderService.delete = jest.fn().mockResolvedValue(mockFolder);

      const result = await controller.remove("folder-1");

      expect(result).toEqual(mockFolder);
      expect(folderService.delete).toHaveBeenCalledWith("folder-1");
    });
  });

  describe("getOpenPath", () => {
    it("should return open path for folder", async () => {
      const mockOpenPath = {
        networkPath: "\\\\10.0.60.30\\Public\\test-folder",
        fileUrl: "file:///10.0.60.30/Public/test-folder",
        explorerCommand: 'explorer.exe "\\\\10.0.60.30\\Public\\test-folder"',
      };

      folderService.findById = jest.fn().mockResolvedValue(mockFolder);
      localEditService.getOpenFolderPath = jest
        .fn()
        .mockReturnValue(mockOpenPath);

      const result = await controller.getOpenPath("folder-1");

      expect(result).toEqual(mockOpenPath);
      expect(folderService.findById).toHaveBeenCalledWith("folder-1");
      expect(localEditService.getOpenFolderPath).toHaveBeenCalledWith(
        mockFolder.path
      );
    });
  });

  describe("sync", () => {
    it("should sync folders with file system", async () => {
      folderSyncService.syncWithFileSystem = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await controller.sync();

      expect(result).toEqual({ message: "Sync completed" });
      expect(folderSyncService.syncWithFileSystem).toHaveBeenCalled();
    });

    it("should throw HttpException when sync fails", async () => {
      const error = new Error("Sync failed");
      folderSyncService.syncWithFileSystem = jest.fn().mockRejectedValue(error);

      await expect(controller.sync()).rejects.toThrow(HttpException);
      await expect(controller.sync()).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        })
      );
    });
  });
});
