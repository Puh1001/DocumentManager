import { Test, TestingModule } from "@nestjs/testing";
import { CustomException } from "@/common/errors/custom-exception";
import { PermissionService } from "./permission.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SubjectType } from "@prisma/client";

describe("PermissionService", () => {
  let service: PermissionService;

  const mockPrismaService = {
    permission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    rolePermission: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    folder: {
      findUnique: jest.fn(),
    },
    folderPermission: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    document: {
      findUnique: jest.fn(),
    },
    documentPermission: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);

    jest.clearAllMocks();
  });

  describe("findAllPermissions", () => {
    it("should return all permissions sorted by name", async () => {
      const mockPermissions = [
        { id: "perm-1", name: "create", description: "Create permission" },
        { id: "perm-2", name: "view", description: "View permission" },
      ];

      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.findAllPermissions();

      expect(result).toEqual(mockPermissions);
      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
      });
    });
  });

  describe("findPermissionById", () => {
    it("should return permission by id", async () => {
      const permissionId = "perm-1";
      const mockPermission = {
        id: permissionId,
        name: "view",
        description: "View permission",
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);

      const result = await service.findPermissionById(permissionId);

      expect(result).toEqual(mockPermission);
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledWith({
        where: { id: permissionId },
      });
    });

    it("should throw NotFoundException when permission not found", async () => {
      const permissionId = "non-existent";

      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.findPermissionById(permissionId)).rejects.toThrow(
        CustomException
      );
    });
  });

  describe("getRolePermissions", () => {
    it("should return role with permissions", async () => {
      const roleId = "role-1";
      const mockRole = {
        id: roleId,
        name: "editor",
        permissions: [
          {
            permission: { id: "perm-1", name: "view" },
          },
          {
            permission: { id: "perm-2", name: "create" },
          },
        ],
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

      const result = await service.getRolePermissions(roleId);

      expect(result.role).toEqual(mockRole);
      expect(result.permissions).toEqual([
        { id: "perm-1", name: "view" },
        { id: "perm-2", name: "create" },
      ]);
    });

    it("should throw NotFoundException when role not found", async () => {
      const roleId = "non-existent";

      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.getRolePermissions(roleId)).rejects.toThrow(
        CustomException
      );
    });
  });

  describe("assignPermissionsToRole", () => {
    it("should assign permissions to role", async () => {
      const roleId = "role-1";
      const permissionIds = ["perm-1", "perm-2"];

      const mockRole = {
        id: roleId,
        name: "editor",
        permissions: [],
      };

      const mockPermissions = [
        { id: "perm-1", name: "view" },
        { id: "perm-2", name: "create" },
      ];

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.rolePermission.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.rolePermission.create.mockResolvedValue({});
      // Prisma $transaction accepts an array of operations (promises)
      mockPrismaService.$transaction.mockImplementation(
        async (operations: Array<Promise<unknown>>) => {
          // Execute all operations and return results
          return Promise.all(operations);
        }
      );

      mockPrismaService.role.findUnique
        .mockResolvedValueOnce(mockRole)
        .mockResolvedValueOnce({
          ...mockRole,
          permissions: [
            { permission: mockPermissions[0] },
            { permission: mockPermissions[1] },
          ],
        });

      await service.assignPermissionsToRole(roleId, permissionIds);

      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: roleId },
      });
      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        where: { id: { in: permissionIds } },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it("should throw NotFoundException when role not found", async () => {
      const roleId = "non-existent";
      const permissionIds = ["perm-1"];

      mockPrismaService.role.findUnique.mockResolvedValue(null);
      // Don't set up permission mock since it should fail before

      await expect(
        service.assignPermissionsToRole(roleId, permissionIds)
      ).rejects.toThrow(CustomException);
    });

    it("should throw BadRequestException when permission not found", async () => {
      const roleId = "role-1";
      const permissionIds = ["perm-1", "perm-2"];

      const mockRole = { id: roleId, name: "editor" };
      const mockPermissions = [{ id: "perm-1", name: "view" }];

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      await expect(
        service.assignPermissionsToRole(roleId, permissionIds)
      ).rejects.toThrow(CustomException);
    });
  });

  describe("getFolderPermissions", () => {
    it("should return folder with permissions", async () => {
      const folderId = "folder-1";
      const mockFolder = {
        id: folderId,
        name: "Test Folder",
        permissions: [
          {
            id: "fp-1",
            subjectType: SubjectType.USER,
            subjectId: "user-1",
            permission: { id: "perm-1", name: "view" },
            inherit: true,
            user: { id: "user-1", username: "testuser" },
            role: null,
          },
        ],
      };

      mockPrismaService.folder.findUnique.mockResolvedValue(mockFolder);

      const result = await service.getFolderPermissions(folderId);

      expect(result.folder).toEqual(mockFolder);
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].subjectType).toBe(SubjectType.USER);
      expect(result.permissions[0].subject).toEqual(
        mockFolder.permissions[0].user
      );
    });

    it("should throw NotFoundException when folder not found", async () => {
      const folderId = "non-existent";

      mockPrismaService.folder.findUnique.mockResolvedValue(null);

      await expect(service.getFolderPermissions(folderId)).rejects.toThrow(
        CustomException
      );
    });
  });

  describe("setFolderPermissions", () => {
    it("should set folder permissions", async () => {
      const folderId = "folder-1";
      const permissions = [
        {
          subjectType: SubjectType.USER,
          subjectId: "user-1",
          permissionId: "perm-1",
          inherit: true,
        },
      ];

      const mockFolder = { id: folderId, name: "Test Folder" };
      const mockUser = { id: "user-1", username: "testuser" };
      const mockPermission = { id: "perm-1", name: "view" };

      mockPrismaService.folder.findUnique.mockResolvedValue(mockFolder);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.folderPermission.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.folderPermission.create.mockResolvedValue({});
      // Prisma $transaction accepts an array of operations (promises)
      mockPrismaService.$transaction.mockImplementation(
        async (operations: Array<Promise<unknown>>) => {
          // Execute all operations
          const results: unknown[] = [];
          for (const op of operations) {
            if (op && typeof op.then === "function") {
              results.push(await op);
            } else {
              results.push(op);
            }
          }
          return results;
        }
      );

      mockPrismaService.folder.findUnique
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce({
          ...mockFolder,
          permissions: [
            {
              id: "fp-1",
              subjectType: SubjectType.USER,
              subjectId: "user-1",
              permission: mockPermission,
              inherit: true,
              user: mockUser,
              role: null,
            },
          ],
        });

      await service.setFolderPermissions(folderId, permissions);

      expect(mockPrismaService.folder.findUnique).toHaveBeenCalledWith({
        where: { id: folderId },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it("should throw NotFoundException when folder not found", async () => {
      const folderId = "non-existent";
      const permissions = [
        {
          subjectType: SubjectType.USER,
          subjectId: "user-1",
          permissionId: "perm-1",
        },
      ];

      mockPrismaService.folder.findUnique.mockResolvedValue(null);
      // Don't set up transaction mock since it should fail before

      await expect(
        service.setFolderPermissions(folderId, permissions)
      ).rejects.toThrow(CustomException);
    });

    it("should throw BadRequestException when user not found", async () => {
      const folderId = "folder-1";
      const permissions = [
        {
          subjectType: SubjectType.USER,
          subjectId: "non-existent",
          permissionId: "perm-1",
        },
      ];

      const mockFolder = { id: folderId, name: "Test Folder" };

      mockPrismaService.folder.findUnique.mockResolvedValue(mockFolder);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.setFolderPermissions(folderId, permissions)
      ).rejects.toThrow(CustomException);
    });

    it("should throw BadRequestException when role not found", async () => {
      const folderId = "folder-1";
      const permissions = [
        {
          subjectType: SubjectType.ROLE,
          subjectId: "non-existent",
          permissionId: "perm-1",
        },
      ];

      const mockFolder = { id: folderId, name: "Test Folder" };

      mockPrismaService.folder.findUnique.mockResolvedValue(mockFolder);
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(
        service.setFolderPermissions(folderId, permissions)
      ).rejects.toThrow(CustomException);
    });
  });

  describe("getDocumentPermissions", () => {
    it("should return document with permissions", async () => {
      const documentId = "doc-1";
      const mockDocument = {
        id: documentId,
        name: "Test Document",
        permissions: [
          {
            id: "dp-1",
            subjectType: SubjectType.ROLE,
            subjectId: "role-1",
            permission: { id: "perm-1", name: "view" },
            user: null,
            role: { id: "role-1", name: "viewer" },
          },
        ],
      };

      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);

      const result = await service.getDocumentPermissions(documentId);

      expect(result.document).toEqual(mockDocument);
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].subjectType).toBe(SubjectType.ROLE);
      expect(result.permissions[0].subject).toEqual(
        mockDocument.permissions[0].role
      );
    });

    it("should throw NotFoundException when document not found", async () => {
      const documentId = "non-existent";

      mockPrismaService.document.findUnique.mockResolvedValue(null);

      await expect(service.getDocumentPermissions(documentId)).rejects.toThrow(
        CustomException
      );
    });
  });

  describe("setDocumentPermissions", () => {
    it("should set document permissions", async () => {
      const documentId = "doc-1";
      const permissions = [
        {
          subjectType: SubjectType.ROLE,
          subjectId: "role-1",
          permissionId: "perm-1",
        },
      ];

      const mockDocument = { id: documentId, name: "Test Document" };
      const mockRole = { id: "role-1", name: "viewer" };
      const mockPermission = { id: "perm-1", name: "view" };

      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.documentPermission.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.documentPermission.create.mockResolvedValue({});
      // Prisma $transaction accepts an array of operations (promises)
      mockPrismaService.$transaction.mockImplementation(
        async (operations: Array<Promise<unknown>>) => {
          return Promise.all(operations);
        }
      );

      mockPrismaService.document.findUnique
        .mockResolvedValueOnce(mockDocument)
        .mockResolvedValueOnce({
          ...mockDocument,
          permissions: [
            {
              id: "dp-1",
              subjectType: SubjectType.ROLE,
              subjectId: "role-1",
              permission: mockPermission,
              user: null,
              role: mockRole,
            },
          ],
        });

      await service.setDocumentPermissions(documentId, permissions);

      expect(mockPrismaService.document.findUnique).toHaveBeenCalledWith({
        where: { id: documentId },
      });
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: "role-1" },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it("should throw NotFoundException when document not found", async () => {
      const documentId = "non-existent";
      const permissions = [
        {
          subjectType: SubjectType.USER,
          subjectId: "user-1",
          permissionId: "perm-1",
        },
      ];

      mockPrismaService.document.findUnique.mockResolvedValue(null);
      // Don't set up user/permission mocks since it should fail before validation

      await expect(
        service.setDocumentPermissions(documentId, permissions)
      ).rejects.toThrow(CustomException);
    });
  });

  describe("create", () => {
    it("should create a new permission", async () => {
      const dto = {
        name: "view:User",
        description: "View user management page",
      };
      const mockPermission = {
        id: "perm-1",
        ...dto,
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(null);
      mockPrismaService.permission.create.mockResolvedValue(mockPermission);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.create(dto, "user-1");

      expect(result).toEqual(mockPermission);
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledWith({
        where: { name: dto.name },
      });
    });

    it("should throw ConflictException when permission name exists", async () => {
      const dto = {
        name: "existing-perm",
        description: "Description",
      };

      mockPrismaService.permission.findUnique.mockResolvedValue({
        id: "perm-1",
        name: dto.name,
      });

      await expect(service.create(dto)).rejects.toThrow(CustomException);
    });
  });

  describe("update", () => {
    it("should update permission", async () => {
      const permissionId = "perm-1";
      const existingPermission = {
        id: permissionId,
        name: "old-name",
        description: "Old description",
      };
      const dto = {
        name: "new-name",
        description: "New description",
      };
      const updatedPermission = {
        ...existingPermission,
        ...dto,
      };

      mockPrismaService.permission.findUnique
        .mockResolvedValueOnce(existingPermission)
        .mockResolvedValueOnce(null);
      mockPrismaService.permission.update.mockResolvedValue(updatedPermission);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.update(permissionId, dto, "user-1");

      expect(result).toEqual(updatedPermission);
    });

    it("should throw ConflictException when new name exists", async () => {
      const permissionId = "perm-1";
      const existingPermission = {
        id: permissionId,
        name: "old-name",
        description: "Old description",
      };
      const dto = {
        name: "existing-name",
      };

      mockPrismaService.permission.findUnique
        .mockResolvedValueOnce(existingPermission)
        .mockResolvedValueOnce({ id: "other-perm", name: "existing-name" });

      await expect(service.update(permissionId, dto)).rejects.toThrow(
        CustomException
      );
    });
  });

  describe("delete", () => {
    it("should delete permission when not in use", async () => {
      const permissionId = "perm-1";
      const mockPermission = {
        id: permissionId,
        name: "custom-perm",
        description: "Custom permission",
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.rolePermission.count.mockResolvedValue(0);
      mockPrismaService.folderPermission.count.mockResolvedValue(0);
      mockPrismaService.documentPermission.count.mockResolvedValue(0);
      mockPrismaService.permission.delete.mockResolvedValue(mockPermission);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.delete(permissionId, "user-1");

      expect(result.message).toBe("Permission deleted successfully");
      expect(mockPrismaService.permission.delete).toHaveBeenCalledWith({
        where: { id: permissionId },
      });
    });

    it("should throw BadRequestException when permission is in use", async () => {
      const permissionId = "perm-1";
      const mockPermission = {
        id: permissionId,
        name: "in-use-perm",
        description: "Permission in use",
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.rolePermission.count.mockResolvedValue(2);
      mockPrismaService.folderPermission.count.mockResolvedValue(1);
      mockPrismaService.documentPermission.count.mockResolvedValue(0);

      await expect(service.delete(permissionId)).rejects.toThrow(
        CustomException
      );
    });
  });
});
