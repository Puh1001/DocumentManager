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

describe("PermissionController", () => {
  let controller: PermissionController;
  let service: PermissionService;

  const mockPermissionService = {
    findAllPermissions: jest.fn(),
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

      const result = await controller.assignPermissionsToRole(roleId, dto);

      expect(result).toEqual(mockResult);
      expect(service.assignPermissionsToRole).toHaveBeenCalledWith(
        roleId,
        dto.permissionIds
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

      mockPermissionService.setFolderPermissions.mockResolvedValue(mockResult);

      const result = await controller.setFolderPermissions(folderId, dto);

      expect(result).toEqual(mockResult);
      expect(service.setFolderPermissions).toHaveBeenCalledWith(
        folderId,
        dto.permissions
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

      mockPermissionService.setDocumentPermissions.mockResolvedValue(
        mockResult
      );

      const result = await controller.setDocumentPermissions(documentId, dto);

      expect(result).toEqual(mockResult);
      expect(service.setDocumentPermissions).toHaveBeenCalledWith(
        documentId,
        dto.permissions
      );
    });
  });
});
