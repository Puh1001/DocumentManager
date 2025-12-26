import { Test, TestingModule } from "@nestjs/testing";
import { PermissionController } from "./permission.controller";
import { PermissionService } from "../services/permission.service";
import { AssignRolePermissionsDto } from "../dto/assign-role-permissions.dto";
import { SetFolderPermissionsDto } from "../dto/set-folder-permissions.dto";
import { SetDocumentPermissionsDto } from "../dto/set-document-permissions.dto";
import { SubjectType } from "@prisma/client";
import { PoliciesGuard } from "../guards/policies.guard";
import { CaslAbilityFactory } from "../factories/casl-ability.factory";
import { PrismaService } from "@/common/prisma/prisma.service";
import { Reflector } from "@nestjs/core";
import { AuthenticatedRequest } from "@/common/types/request.types";

describe("PermissionController", () => {
  let controller: PermissionController;
  let service: PermissionService;

  const mockPermissionService = {
    findAllPermissions: jest.fn(),
    findPermissionById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getRolePermissions: jest.fn(),
    assignPermissionsToRole: jest.fn(),
    getFolderPermissions: jest.fn(),
    setFolderPermissions: jest.fn(),
    getDocumentPermissions: jest.fn(),
    setDocumentPermissions: jest.fn(),
  };

  const mockPoliciesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: PoliciesGuard,
          useValue: mockPoliciesGuard,
        },
        {
          provide: CaslAbilityFactory,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: Reflector,
          useValue: {},
        },
      ],
    })
      .overrideGuard(PoliciesGuard)
      .useValue(mockPoliciesGuard)
      .compile();

    controller = module.get<PermissionController>(PermissionController);
    service = module.get<PermissionService>(PermissionService);

    jest.clearAllMocks();
  });

  describe("findAllPermissions", () => {
    it("should return all permissions", async () => {
      const mockPermissions = [
        { id: "perm-1", name: "view", description: "View permission" },
        { id: "perm-2", name: "create", description: "Create permission" },
      ];

      mockPermissionService.findAllPermissions.mockResolvedValue(
        mockPermissions
      );

      const result = await controller.findAllPermissions();

      expect(result).toEqual(mockPermissions);
      expect(service.findAllPermissions).toHaveBeenCalled();
    });
  });

  describe("getRolePermissions", () => {
    it("should return role permissions", async () => {
      const roleId = "role-1";
      const mockResult = {
        role: { id: roleId, name: "editor" },
        permissions: [
          { id: "perm-1", name: "view" },
          { id: "perm-2", name: "create" },
        ],
      };

      mockPermissionService.getRolePermissions.mockResolvedValue(mockResult);

      const result = await controller.getRolePermissions(roleId);

      expect(result).toEqual(mockResult);
      expect(service.getRolePermissions).toHaveBeenCalledWith(roleId);
    });
  });

  describe("assignPermissionsToRole", () => {
    it("should assign permissions to role", async () => {
      const roleId = "role-1";
      const dto: AssignRolePermissionsDto = {
        permissionIds: ["perm-1", "perm-2"],
      };
      const mockRequest: AuthenticatedRequest = {
        user: {
          id: "user-1",
          username: "admin",
          roles: ["admin"],
        },
      } as AuthenticatedRequest;

      const mockResult = {
        role: { id: roleId, name: "editor" },
        permissions: [
          { id: "perm-1", name: "view" },
          { id: "perm-2", name: "create" },
        ],
      };

      mockPermissionService.assignPermissionsToRole.mockResolvedValue(
        mockResult
      );

      const result = await controller.assignPermissionsToRole(
        roleId,
        dto,
        mockRequest
      );

      expect(result).toEqual(mockResult);
      expect(service.assignPermissionsToRole).toHaveBeenCalledWith(
        roleId,
        dto.permissionIds,
        "user-1"
      );
    });
  });

  describe("getFolderPermissions", () => {
    it("should return folder permissions", async () => {
      const folderId = "folder-1";
      const mockResult = {
        folder: { id: folderId, name: "Test Folder" },
        permissions: [
          {
            id: "fp-1",
            subjectType: SubjectType.USER,
            subjectId: "user-1",
            subject: { id: "user-1", username: "testuser" },
            permission: { id: "perm-1", name: "view" },
            inherit: true,
          },
        ],
      };

      mockPermissionService.getFolderPermissions.mockResolvedValue(mockResult);

      const result = await controller.getFolderPermissions(folderId);

      expect(result).toEqual(mockResult);
      expect(service.getFolderPermissions).toHaveBeenCalledWith(folderId);
    });
  });

  describe("setFolderPermissions", () => {
    it("should set folder permissions", async () => {
      const folderId = "folder-1";
      const dto: SetFolderPermissionsDto = {
        permissions: [
          {
            subjectType: SubjectType.USER,
            subjectId: "user-1",
            permissionId: "perm-1",
            inherit: true,
          },
        ],
      };

      const mockResult = {
        folder: { id: folderId, name: "Test Folder" },
        permissions: [
          {
            id: "fp-1",
            subjectType: SubjectType.USER,
            subjectId: "user-1",
            subject: { id: "user-1", username: "testuser" },
            permission: { id: "perm-1", name: "view" },
            inherit: true,
          },
        ],
      };

      const mockRequest: AuthenticatedRequest = {
        user: {
          id: "user-1",
          username: "admin",
          roles: ["admin"],
        },
      } as AuthenticatedRequest;

      mockPermissionService.setFolderPermissions.mockResolvedValue(mockResult);

      const result = await controller.setFolderPermissions(
        folderId,
        dto,
        mockRequest
      );

      expect(result).toEqual(mockResult);
      expect(service.setFolderPermissions).toHaveBeenCalledWith(
        folderId,
        dto.permissions,
        "user-1"
      );
    });
  });

  describe("getDocumentPermissions", () => {
    it("should return document permissions", async () => {
      const documentId = "doc-1";
      const mockResult = {
        document: { id: documentId, name: "Test Document" },
        permissions: [
          {
            id: "dp-1",
            subjectType: SubjectType.ROLE,
            subjectId: "role-1",
            subject: { id: "role-1", name: "viewer" },
            permission: { id: "perm-1", name: "view" },
          },
        ],
      };

      mockPermissionService.getDocumentPermissions.mockResolvedValue(
        mockResult
      );

      const result = await controller.getDocumentPermissions(documentId);

      expect(result).toEqual(mockResult);
      expect(service.getDocumentPermissions).toHaveBeenCalledWith(documentId);
    });
  });

  describe("setDocumentPermissions", () => {
    it("should set document permissions", async () => {
      const documentId = "doc-1";
      const dto: SetDocumentPermissionsDto = {
        permissions: [
          {
            subjectType: SubjectType.ROLE,
            subjectId: "role-1",
            permissionId: "perm-1",
          },
        ],
      };

      const mockResult = {
        document: { id: documentId, name: "Test Document" },
        permissions: [
          {
            id: "dp-1",
            subjectType: SubjectType.ROLE,
            subjectId: "role-1",
            subject: { id: "role-1", name: "viewer" },
            permission: { id: "perm-1", name: "view" },
          },
        ],
      };

      const mockRequest: AuthenticatedRequest = {
        user: {
          id: "user-1",
          username: "admin",
          roles: ["admin"],
        },
      } as AuthenticatedRequest;

      mockPermissionService.setDocumentPermissions.mockResolvedValue(
        mockResult
      );

      const result = await controller.setDocumentPermissions(
        documentId,
        dto,
        mockRequest
      );

      expect(result).toEqual(mockResult);
      expect(service.setDocumentPermissions).toHaveBeenCalledWith(
        documentId,
        dto.permissions,
        "user-1"
      );
    });
  });

  describe("findOne", () => {
    it("should return permission by id", async () => {
      const permissionId = "perm-1";
      const mockPermission = {
        id: permissionId,
        name: "view",
        description: "View permission",
      };

      mockPermissionService.findPermissionById.mockResolvedValue(
        mockPermission
      );

      const result = await controller.findOne(permissionId);

      expect(result).toEqual(mockPermission);
      expect(service.findPermissionById).toHaveBeenCalledWith(permissionId);
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

      const mockRequest: AuthenticatedRequest = {
        user: {
          id: "user-1",
          username: "admin",
          roles: ["admin"],
        },
      } as AuthenticatedRequest;

      mockPermissionService.create.mockResolvedValue(mockPermission);

      const result = await controller.create(dto, mockRequest);

      expect(result).toEqual(mockPermission);
      expect(service.create).toHaveBeenCalledWith(dto, mockRequest.user.id);
    });
  });

  describe("update", () => {
    it("should update permission", async () => {
      const permissionId = "perm-1";
      const dto = {
        description: "Updated description",
      };
      const mockPermission = {
        id: permissionId,
        name: "view",
        ...dto,
      };

      const mockRequest: AuthenticatedRequest = {
        user: {
          id: "user-1",
          username: "admin",
          roles: ["admin"],
        },
      } as AuthenticatedRequest;

      mockPermissionService.update.mockResolvedValue(mockPermission);

      const result = await controller.update(permissionId, dto, mockRequest);

      expect(result).toEqual(mockPermission);
      expect(service.update).toHaveBeenCalledWith(
        permissionId,
        dto,
        mockRequest.user.id
      );
    });
  });

  describe("remove", () => {
    it("should delete permission", async () => {
      const permissionId = "perm-1";
      const mockResult = { message: "Permission deleted successfully" };

      const mockRequest: AuthenticatedRequest = {
        user: {
          id: "user-1",
          username: "admin",
          roles: ["admin"],
        },
      } as AuthenticatedRequest;

      mockPermissionService.delete.mockResolvedValue(mockResult);

      const result = await controller.remove(permissionId, mockRequest);

      expect(result).toEqual(mockResult);
      expect(service.delete).toHaveBeenCalledWith(
        permissionId,
        mockRequest.user.id
      );
    });
  });
});
