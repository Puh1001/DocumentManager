import { Test, TestingModule } from "@nestjs/testing";
import { FolderController } from "./folder.controller";
import { FolderService, FolderTreeNode } from "../services/folder.service";
import { FolderSyncService } from "../services/folder-sync.service";
import { FolderSyncGateway } from "../gateways/folder-sync.gateway";
import { LocalEditService } from "../services/local-edit.service";
import { UsersService } from "@/modules/users/users.service";
import { CreateFolderDto } from "../dto/create-folder.dto";
import { UpdateFolderDto } from "../dto/update-folder.dto";

describe("FolderController", () => {
  let controller: FolderController;
  let folderService: jest.Mocked<FolderService>;
  let folderSyncService: jest.Mocked<FolderSyncService>;
  let localEditService: jest.Mocked<LocalEditService>;
  let usersService: jest.Mocked<UsersService>;

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
      getTreeWithDocuments: jest.fn(),
    };

    const mockFolderSyncService = {
      syncWithFileSystem: jest.fn(),
    };

    const mockLocalEditService = {
      getOpenFolderPath: jest.fn(),
    };

    const mockFolderSyncGateway = {
      broadcastSyncEvent: jest.fn(),
    };

    const mockUsersService = {
      getUserDepartments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FolderController],
      providers: [
        { provide: FolderService, useValue: mockFolderService },
        { provide: FolderSyncService, useValue: mockFolderSyncService },
        { provide: FolderSyncGateway, useValue: mockFolderSyncGateway },
        { provide: LocalEditService, useValue: mockLocalEditService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<FolderController>(FolderController);
    folderService = module.get(FolderService);
    folderSyncService = module.get(FolderSyncService);
    localEditService = module.get(LocalEditService);
    usersService = module.get(UsersService);
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
      expect(folderService.findAll).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should return folders with parentId filter", async () => {
      const mockFolders = [mockFolder];
      folderService.findAll = jest.fn().mockResolvedValue(mockFolders);

      const result = await controller.findAll("parent-1");

      expect(result).toEqual(mockFolders);
      expect(folderService.findAll).toHaveBeenCalledWith(
        "parent-1",
        undefined,
      );
    });
  });

  describe("getTree", () => {
    it("should return folder tree structure", async () => {
      folderService.getTree = jest.fn().mockResolvedValue(mockTree);

      const result = await controller.getTree();

      expect(result).toEqual(mockTree);
      expect(folderService.getTree).toHaveBeenCalled();
    });

    it("should allow admin to get tree for any departmentId", async () => {
      folderService.getTree = jest.fn().mockResolvedValue(mockTree);
      const req = {
        user: { id: "user-1", roles: ["admin"] },
      } as unknown as Parameters<FolderController["getTree"]>[1];

      const result = await controller.getTree("dept-1", req);

      expect(result).toEqual(mockTree);
      expect(folderService.getTree).toHaveBeenCalledWith("dept-1", true);
      expect(usersService.getUserDepartments).not.toHaveBeenCalled();
    });

    it("should allow user in department to get tree for that department", async () => {
      folderService.getTree = jest.fn().mockResolvedValue(mockTree);
      usersService.getUserDepartments = jest
        .fn()
        .mockResolvedValue([{ id: "dept-1", name: "Dept 1", code: "D1" }]);
      const req = {
        user: { id: "user-1", roles: ["user"] },
      } as unknown as Parameters<FolderController["getTree"]>[1];

      const result = await controller.getTree("dept-1", req);

      expect(result).toEqual(mockTree);
      expect(usersService.getUserDepartments).toHaveBeenCalledWith("user-1");
      expect(folderService.getTree).toHaveBeenCalledWith("dept-1", false);
    });

    it("should deny user not in department when departmentId provided", async () => {
      usersService.getUserDepartments = jest
        .fn()
        .mockResolvedValue([{ id: "other-dept", name: "Other", code: "O" }]);
      const req = {
        user: { id: "user-1", roles: ["user"] },
      } as unknown as Parameters<FolderController["getTree"]>[1];

      await expect(controller.getTree("dept-1", req)).rejects.toThrow();
      expect(folderService.getTree).not.toHaveBeenCalled();
    });
  });

  describe("getTreeWithDocuments", () => {
    it("should return tree with documents and allow admin for any departmentId", async () => {
      const mockTreeWithDocs = mockTree.map((n) => ({
        ...n,
        documents: [],
      }));
      folderService.getTreeWithDocuments = jest
        .fn()
        .mockResolvedValue(mockTreeWithDocs);
      const req = {
        user: { id: "user-1", roles: ["admin"] },
      } as unknown as Parameters<FolderController["getTreeWithDocuments"]>[1];

      const result = await controller.getTreeWithDocuments("dept-1", req);

      expect(result).toEqual(mockTreeWithDocs);
      expect(folderService.getTreeWithDocuments).toHaveBeenCalledWith(
        "dept-1",
        true,
      );
      expect(usersService.getUserDepartments).not.toHaveBeenCalled();
    });

    it("should deny user not in department when departmentId provided", async () => {
      usersService.getUserDepartments = jest
        .fn()
        .mockResolvedValue([{ id: "other-dept", name: "Other", code: "O" }]);
      const req = {
        user: { id: "user-1", roles: ["user"] },
      } as unknown as Parameters<FolderController["getTreeWithDocuments"]>[1];

      await expect(
        controller.getTreeWithDocuments("dept-1", req),
      ).rejects.toThrow();
      expect(folderService.getTreeWithDocuments).not.toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return folder by id", async () => {
      folderService.findById = jest.fn().mockResolvedValue(mockFolder);

      const result = await controller.findOne("folder-1");

      expect(result).toEqual(mockFolder);
      expect(folderService.findById).toHaveBeenCalledWith("folder-1", undefined);
    });

    it("should return folder by id with status filter", async () => {
      folderService.findById = jest.fn().mockResolvedValue(mockFolder);

      const result = await controller.findOne("folder-1", "ACTIVE");

      expect(result).toEqual(mockFolder);
      expect(folderService.findById).toHaveBeenCalledWith("folder-1", "ACTIVE");
    });

    it("should handle empty string status", async () => {
      folderService.findById = jest.fn().mockResolvedValue(mockFolder);

      const result = await controller.findOne("folder-1", "");

      expect(result).toEqual(mockFolder);
      expect(folderService.findById).toHaveBeenCalledWith("folder-1", "");
      // Note: Empty string will be treated as invalid by service, which is fine
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

      expect(result).toEqual({
        message: "Sync started",
        status: "processing",
      });
      expect(folderSyncService.syncWithFileSystem).toHaveBeenCalled();
    });

    it("should return immediately when sync is triggered (errors handled in background)", async () => {
      folderSyncService.syncWithFileSystem = jest
        .fn()
        .mockRejectedValue(new Error("Sync failed"));

      const result = await controller.sync();

      expect(result).toEqual({
        message: "Sync started",
        status: "processing",
      });
      expect(folderSyncService.syncWithFileSystem).toHaveBeenCalled();
    });
  });
});
