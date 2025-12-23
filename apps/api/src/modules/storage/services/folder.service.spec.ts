import { Test, TestingModule } from "@nestjs/testing";
import { CustomException } from "@/common/errors/custom-exception";
import { FolderService } from "./folder.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SmbService } from "./smb.service";
import { CreateFolderDto } from "../dto/create-folder.dto";
import { UpdateFolderDto } from "../dto/update-folder.dto";

describe("FolderService", () => {
  let service: FolderService;
  let prismaService: jest.Mocked<PrismaService>;
  let smbService: jest.Mocked<SmbService>;

  const mockFolder = {
    id: "folder-1",
    name: "Test Folder",
    path: "test-folder",
    parentId: null,
    physicalLocation: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    children: [],
    documents: [],
    permissions: [],
    parent: null,
    _count: {
      children: 0,
      documents: 0,
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      folder: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockSmbService = {
      createDirectory: jest.fn(),
      rename: jest.fn(),
      deleteDirectory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FolderService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SmbService, useValue: mockSmbService },
      ],
    }).compile();

    service = module.get<FolderService>(FolderService);
    prismaService = module.get(PrismaService);
    smbService = module.get(SmbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all root folders when parentId is not provided", async () => {
      const mockFolders = [mockFolder];
      prismaService.folder.findMany = jest.fn().mockResolvedValue(mockFolders);

      const result = await service.findAll();

      expect(result).toEqual(mockFolders);
      expect(prismaService.folder.findMany).toHaveBeenCalledWith({
        where: {
          parentId: null,
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              children: true,
              documents: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    });

    it("should return folders with specific parentId", async () => {
      const mockFolders = [{ ...mockFolder, parentId: "parent-1" }];
      prismaService.folder.findMany = jest.fn().mockResolvedValue(mockFolders);

      const result = await service.findAll("parent-1");

      expect(result).toEqual(mockFolders);
      expect(prismaService.folder.findMany).toHaveBeenCalledWith({
        where: {
          parentId: "parent-1",
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              children: true,
              documents: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("findById", () => {
    it("should return folder by id", async () => {
      prismaService.folder.findUnique = jest.fn().mockResolvedValue(mockFolder);

      const result = await service.findById("folder-1");

      expect(result).toEqual(mockFolder);
      expect(prismaService.folder.findUnique).toHaveBeenCalledWith({
        where: { id: "folder-1" },
        include: {
          parent: true,
          children: {
            where: { deletedAt: null },
            orderBy: { name: "asc" },
          },
          documents: {
            where: { status: "ACTIVE" },
            orderBy: { name: "asc" },
          },
          permissions: {
            include: { permission: true },
          },
        },
      });
    });

    it("should throw NotFoundException when folder does not exist", async () => {
      prismaService.folder.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.findById("invalid-id")).rejects.toThrow(
        CustomException
      );
    });

    it("should throw NotFoundException when folder is deleted", async () => {
      const deletedFolder = { ...mockFolder, deletedAt: new Date() };
      prismaService.folder.findUnique = jest
        .fn()
        .mockResolvedValue(deletedFolder);

      await expect(service.findById("folder-1")).rejects.toThrow(
        CustomException
      );
    });
  });

  describe("create", () => {
    it("should create root folder", async () => {
      const dto: CreateFolderDto = {
        name: "New Folder",
        parentId: undefined,
        physicalLocation: undefined,
      };

      smbService.createDirectory = jest.fn().mockResolvedValue(undefined);
      prismaService.folder.create = jest.fn().mockResolvedValue({
        ...mockFolder,
        name: "New Folder",
        path: "New Folder",
      });

      const result = await service.create(dto);

      expect(smbService.createDirectory).toHaveBeenCalledWith("New Folder");
      expect(prismaService.folder.create).toHaveBeenCalledWith({
        data: {
          name: "New Folder",
          path: "New Folder",
          parentId: undefined,
          physicalLocation: undefined,
        },
      });
      expect(result.name).toBe("New Folder");
    });

    it("should create folder with parent", async () => {
      const parentFolder = {
        ...mockFolder,
        id: "parent-1",
        path: "parent-folder",
      };

      const dto: CreateFolderDto = {
        name: "Child Folder",
        parentId: "parent-1",
        physicalLocation: undefined,
      };

      prismaService.folder.findUnique = jest
        .fn()
        .mockResolvedValue(parentFolder);
      smbService.createDirectory = jest.fn().mockResolvedValue(undefined);
      prismaService.folder.create = jest.fn().mockResolvedValue({
        ...mockFolder,
        name: "Child Folder",
        path: "parent-folder/Child Folder",
        parentId: "parent-1",
      });

      const result = await service.create(dto);

      expect(prismaService.folder.findUnique).toHaveBeenCalledWith({
        where: { id: "parent-1" },
      });
      expect(smbService.createDirectory).toHaveBeenCalledWith(
        "parent-folder/Child Folder"
      );
      expect(result.path).toBe("parent-folder/Child Folder");
    });

    it("should throw NotFoundException when parent does not exist", async () => {
      const dto: CreateFolderDto = {
        name: "Child Folder",
        parentId: "invalid-parent",
        physicalLocation: undefined,
      };

      prismaService.folder.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(CustomException);
    });

    it("should throw NotFoundException when parent is deleted", async () => {
      const deletedParent = {
        ...mockFolder,
        id: "parent-1",
        deletedAt: new Date(),
      };

      const dto: CreateFolderDto = {
        name: "Child Folder",
        parentId: "parent-1",
        physicalLocation: undefined,
      };

      prismaService.folder.findUnique = jest
        .fn()
        .mockResolvedValue(deletedParent);

      await expect(service.create(dto)).rejects.toThrow(CustomException);
    });
  });

  describe("update", () => {
    it("should update folder name and path", async () => {
      const dto: UpdateFolderDto = {
        name: "Renamed Folder",
      };

      prismaService.folder.findUnique = jest.fn().mockResolvedValue(mockFolder);
      smbService.rename = jest.fn().mockResolvedValue(undefined);
      prismaService.folder.update = jest.fn().mockResolvedValue({
        ...mockFolder,
        name: "Renamed Folder",
        path: "Renamed Folder",
      });

      const result = await service.update("folder-1", dto);

      expect(smbService.rename).toHaveBeenCalledWith(
        "test-folder",
        "Renamed Folder"
      );
      expect(prismaService.folder.update).toHaveBeenCalledWith({
        where: { id: "folder-1" },
        data: {
          name: "Renamed Folder",
          path: "Renamed Folder",
        },
      });
      expect(result.name).toBe("Renamed Folder");
    });

    it("should update physicalLocation only", async () => {
      const dto: UpdateFolderDto = {
        physicalLocation: "\\\\server\\share\\path",
      };

      prismaService.folder.findUnique = jest.fn().mockResolvedValue(mockFolder);
      prismaService.folder.update = jest.fn().mockResolvedValue({
        ...mockFolder,
        physicalLocation: "\\\\server\\share\\path",
      });

      const result = await service.update("folder-1", dto);

      expect(smbService.rename).not.toHaveBeenCalled();
      expect(prismaService.folder.update).toHaveBeenCalledWith({
        where: { id: "folder-1" },
        data: {
          physicalLocation: "\\\\server\\share\\path",
        },
      });
      expect(result.physicalLocation).toBe("\\\\server\\share\\path");
    });

    it("should throw NotFoundException when folder does not exist", async () => {
      const dto: UpdateFolderDto = { name: "New Name" };

      prismaService.folder.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.update("invalid-id", dto)).rejects.toThrow(
        CustomException
      );
    });

    it("should throw NotFoundException when folder is deleted", async () => {
      const deletedFolder = { ...mockFolder, deletedAt: new Date() };
      const dto: UpdateFolderDto = { name: "New Name" };

      prismaService.folder.findUnique = jest
        .fn()
        .mockResolvedValue(deletedFolder);

      await expect(service.update("folder-1", dto)).rejects.toThrow(
        CustomException
      );
    });
  });

  describe("delete", () => {
    it("should delete empty folder", async () => {
      prismaService.folder.findUnique = jest.fn().mockResolvedValue(mockFolder);
      smbService.deleteDirectory = jest.fn().mockResolvedValue(undefined);
      prismaService.folder.delete = jest.fn().mockResolvedValue(mockFolder);

      const result = await service.delete("folder-1");

      expect(smbService.deleteDirectory).toHaveBeenCalledWith("test-folder");
      expect(prismaService.folder.delete).toHaveBeenCalledWith({
        where: { id: "folder-1" },
      });
      expect(result).toEqual(mockFolder);
    });

    it("should throw NotFoundException when folder does not exist", async () => {
      prismaService.folder.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.delete("invalid-id")).rejects.toThrow(
        CustomException
      );
    });

    it("should throw Error when folder has children", async () => {
      const folderWithChildren = {
        ...mockFolder,
        children: [{ id: "child-1", name: "Child" }],
      };

      prismaService.folder.findUnique = jest
        .fn()
        .mockResolvedValue(folderWithChildren);

      await expect(service.delete("folder-1")).rejects.toThrow(
        "Cannot delete non-empty folder"
      );
    });

    it("should throw Error when folder has documents", async () => {
      const folderWithDocuments = {
        ...mockFolder,
        documents: [{ id: "doc-1", name: "Document.pdf" }],
      };

      prismaService.folder.findUnique = jest
        .fn()
        .mockResolvedValue(folderWithDocuments);

      await expect(service.delete("folder-1")).rejects.toThrow(
        "Cannot delete non-empty folder"
      );
    });
  });

  describe("getTree", () => {
    it("should return folder tree structure", async () => {
      const folders = [
        {
          ...mockFolder,
          id: "root-1",
          name: "Root 1",
          path: "root-1",
          parentId: null,
          _count: { documents: 2 },
        },
        {
          ...mockFolder,
          id: "child-1",
          name: "Child 1",
          path: "root-1/child-1",
          parentId: "root-1",
          _count: { documents: 1 },
        },
      ];

      prismaService.folder.findMany = jest.fn().mockResolvedValue(folders);

      const result = await service.getTree();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("root-1");
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe("child-1");
      expect(result[0].documentCount).toBe(2);
    });

    it("should return empty array when no folders exist", async () => {
      prismaService.folder.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getTree();

      expect(result).toEqual([]);
    });
  });

  describe("count", () => {
    it("should return count of active folders", async () => {
      prismaService.folder.count = jest.fn().mockResolvedValue(10);

      const result = await service.count();

      expect(result).toBe(10);
      expect(prismaService.folder.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });
  });
});
