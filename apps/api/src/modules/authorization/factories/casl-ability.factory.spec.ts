import { Test, TestingModule } from "@nestjs/testing";
import { subject } from "@casl/ability";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { PrismaService } from "@/common/prisma/prisma.service";
import { Document, Folder } from "../types/ability.types";
import { SubjectType } from "@prisma/client";

describe("CaslAbilityFactory", () => {
  let factory: CaslAbilityFactory;

  const mockPrismaService = {
    role: {
      findMany: jest.fn(),
    },
    module: {
      findMany: jest.fn(),
    },
    rolePermission: {
      findMany: jest.fn(),
    },
    folderPermission: {
      findMany: jest.fn(),
    },
    documentPermission: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaslAbilityFactory,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    factory = module.get<CaslAbilityFactory>(CaslAbilityFactory);

    jest.clearAllMocks();
  });

  describe("createForUser", () => {
    it("should grant full access to admin users", async () => {
      const userId = "user-1";
      const userRoles = ["admin"];

      const ability = await factory.createForUser(userId, userRoles);

      expect(ability.can("manage", "all")).toBe(true);
      expect(ability.can("view", "Document")).toBe(true);
      expect(ability.can("delete", "Folder")).toBe(true);
      expect(mockPrismaService.role.findMany).not.toHaveBeenCalled();
    });

    it("should load permissions for non-admin users", async () => {
      const userId = "user-1";
      const userRoles = ["editor"];
      const roleId = "role-1";
      const folderId = "folder-1";
      const documentId = "doc-1";

      mockPrismaService.role.findMany.mockResolvedValue([{ id: roleId }]);
      mockPrismaService.module.findMany.mockResolvedValue([
        { name: "User" },
        { name: "Department" },
      ]);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([
        {
          folderId,
          permission: { name: "view" },
          inherit: true,
        },
      ]);

      mockPrismaService.documentPermission.findMany.mockResolvedValue([
        {
          documentId,
          permission: { name: "edit" },
        },
      ]);

      const ability = await factory.createForUser(userId, userRoles);

      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: { name: { in: userRoles } },
        select: { id: true },
      });

      // CASL needs subject type when checking objects - use subject helper
      const folder: Folder = { id: folderId };
      expect(ability.can("view", subject("Folder", folder))).toBe(true);

      // Check document permission inheritance - CASL checks folderId condition
      const document: Document = { id: documentId, folderId };
      expect(ability.can("view", subject("Document", document))).toBe(true);

      // Check direct document permission
      const documentWithDirectPerm: Document = { id: documentId };
      expect(
        ability.can("edit", subject("Document", documentWithDirectPerm))
      ).toBe(true);
    });

    it("should handle empty roles array", async () => {
      const userId = "user-1";
      const userRoles: string[] = [];
      mockPrismaService.module.findMany.mockResolvedValue([]);

      mockPrismaService.role.findMany.mockResolvedValue([]);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);
      mockPrismaService.folderPermission.findMany.mockResolvedValue([]);
      mockPrismaService.documentPermission.findMany.mockResolvedValue([]);

      const ability = await factory.createForUser(userId, userRoles);

      expect(ability.can("view", "Document")).toBe(false);
      expect(ability.can("view", "Folder")).toBe(false);
    });

    it("should apply folder permissions with inheritance", async () => {
      const userId = "user-1";
      const userRoles = ["viewer"];
      const roleId = "role-1";
      const folderId = "folder-1";

      mockPrismaService.role.findMany.mockResolvedValue([{ id: roleId }]);
      mockPrismaService.module.findMany.mockResolvedValue([]);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([
        {
          folderId,
          permission: { name: "view" },
          inherit: true,
        },
      ]);

      mockPrismaService.documentPermission.findMany.mockResolvedValue([]);

      const ability = await factory.createForUser(userId, userRoles);

      const folder: Folder = { id: folderId };
      const document: Document = { id: "doc-1", folderId };

      // Folder permission should work
      expect(ability.can("view", subject("Folder", folder))).toBe(true);
      // Document inheritance should work (folderId matches)
      expect(ability.can("view", subject("Document", document))).toBe(true);
    });

    it("should apply folder permissions without inheritance", async () => {
      const userId = "user-1";
      const userRoles = ["viewer"];
      const roleId = "role-1";
      const folderId = "folder-1";

      mockPrismaService.role.findMany.mockResolvedValue([{ id: roleId }]);
      mockPrismaService.module.findMany.mockResolvedValue([]);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([
        {
          folderId,
          permission: { name: "view" },
          inherit: false,
        },
      ]);

      mockPrismaService.documentPermission.findMany.mockResolvedValue([]);

      const ability = await factory.createForUser(userId, userRoles);

      const folder: Folder = { id: folderId };
      const document: Document = { id: "doc-1", folderId };

      expect(ability.can("view", subject("Folder", folder))).toBe(true);
      expect(ability.can("view", subject("Document", document))).toBe(false);
    });

    it("should apply document permissions that override folder permissions", async () => {
      const userId = "user-1";
      const userRoles = ["viewer"];
      const roleId = "role-1";
      const folderId = "folder-1";
      const documentId = "doc-1";

      mockPrismaService.role.findMany.mockResolvedValue([{ id: roleId }]);
      mockPrismaService.module.findMany.mockResolvedValue([]);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([
        {
          folderId,
          permission: { name: "view" },
          inherit: true,
        },
      ]);

      mockPrismaService.documentPermission.findMany.mockResolvedValue([
        {
          documentId,
          permission: { name: "edit" },
        },
      ]);

      const ability = await factory.createForUser(userId, userRoles);

      const document: Document = { id: documentId, folderId };

      // Document permission should override folder permission
      expect(ability.can("edit", subject("Document", document))).toBe(true);
      // View permission comes from folder inheritance
      expect(ability.can("view", subject("Document", document))).toBe(true);
    });

    it("should handle user-specific permissions", async () => {
      const userId = "user-1";
      const userRoles: string[] = [];
      const folderId = "folder-1";

      mockPrismaService.role.findMany.mockResolvedValue([]);
      mockPrismaService.module.findMany.mockResolvedValue([]);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([
        {
          folderId,
          permission: { name: "view" },
          inherit: true,
          subjectType: SubjectType.USER,
          subjectId: userId,
        },
      ]);

      mockPrismaService.documentPermission.findMany.mockResolvedValue([]);

      const ability = await factory.createForUser(userId, userRoles);

      const folder: Folder = { id: folderId };
      expect(ability.can("view", subject("Folder", folder))).toBe(true);
    });

    it("should handle role-based permissions", async () => {
      const userId = "user-1";
      const userRoles = ["manager"];
      const roleId = "role-1";
      const folderId = "folder-1";

      mockPrismaService.role.findMany.mockResolvedValue([{ id: roleId }]);
      mockPrismaService.module.findMany.mockResolvedValue([]);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([
        {
          folderId,
          permission: { name: "manage" },
          inherit: true,
          subjectType: SubjectType.ROLE,
          subjectId: roleId,
        },
      ]);

      mockPrismaService.documentPermission.findMany.mockResolvedValue([]);

      const ability = await factory.createForUser(userId, userRoles);

      const folder: Folder = { id: folderId };
      // Role-based folder permission should work
      expect(ability.can("manage", subject("Folder", folder))).toBe(true);
    });

    it("should apply module permissions for page access", async () => {
      const userId = "user-1";
      const userRoles = ["editor"];
      const roleId = "role-1";

      mockPrismaService.role.findMany.mockResolvedValue([{ id: roleId }]);
      mockPrismaService.module.findMany.mockResolvedValue([
        { name: "User" },
        { name: "Department" },
        { name: "Kpi" },
        { name: "Maintenance" },
        { name: "Permission" },
      ]);

      // Mock role permissions with module permissions
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        {
          roleId,
          permission: { name: "view:User" },
        },
        {
          roleId,
          permission: { name: "view:Department" },
        },
        {
          roleId,
          permission: { name: "view:Kpi" },
        },
      ]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([]);
      mockPrismaService.documentPermission.findMany.mockResolvedValue([]);

      const ability = await factory.createForUser(userId, userRoles);

      // Should have access to User page
      expect(ability.can("view", "User")).toBe(true);
      // Should have access to Department page
      expect(ability.can("view", "Department")).toBe(true);
      // Should have access to Kpi page
      expect(ability.can("view", "Kpi")).toBe(true);
      // Should NOT have access to Maintenance page (not granted)
      expect(ability.can("view", "Maintenance")).toBe(false);
      // Should NOT have access to Permission page (not granted)
      expect(ability.can("view", "Permission")).toBe(false);
    });

    it("should handle invalid module permission format", async () => {
      const userId = "user-1";
      const userRoles = ["editor"];
      const roleId = "role-1";

      mockPrismaService.role.findMany.mockResolvedValue([{ id: roleId }]);
      mockPrismaService.module.findMany.mockResolvedValue([
        { name: "User" },
        { name: "Department" },
      ]);

      // Mock role permissions with invalid format
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        {
          roleId,
          permission: { name: "invalid:format:too:many:parts" },
        },
        {
          roleId,
          permission: { name: "invalidModule" },
        },
        {
          roleId,
          permission: { name: "view:InvalidModule" },
        },
        {
          roleId,
          permission: { name: "view:User" }, // Valid one
        },
      ]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([]);
      mockPrismaService.documentPermission.findMany.mockResolvedValue([]);

      const ability = await factory.createForUser(userId, userRoles);

      // Only valid permission should be applied
      expect(ability.can("view", "User")).toBe(true);
      expect(ability.can("view", "Department")).toBe(false);
    });

    it("should grant admin access to all module pages", async () => {
      const userId = "user-1";
      const userRoles = ["admin"];

      const ability = await factory.createForUser(userId, userRoles);

      // Admin should have access to all module pages via manage:all
      expect(ability.can("view", "User")).toBe(true);
      expect(ability.can("view", "Department")).toBe(true);
      expect(ability.can("view", "Kpi")).toBe(true);
      expect(ability.can("view", "Maintenance")).toBe(true);
      expect(ability.can("view", "Permission")).toBe(true);
      expect(ability.can("manage", "User")).toBe(true);
    });

    it("should grant boss read-only access to all module pages", async () => {
      const userId = "user-1";
      const userRoles = ["boss"];

      const ability = await factory.createForUser(userId, userRoles);

      // Boss should have view access to all module pages
      expect(ability.can("view", "User")).toBe(true);
      expect(ability.can("view", "Department")).toBe(true);
      expect(ability.can("view", "Kpi")).toBe(true);
      expect(ability.can("view", "Maintenance")).toBe(true);
      expect(ability.can("view", "Permission")).toBe(true);
      // But not manage access
      expect(ability.can("manage", "User")).toBe(false);
    });

    it("should apply KPI permissions from role permissions", async () => {
      const userId = "user-1";
      const userRoles = ["editor"];
      const roleId = "role-1";

      mockPrismaService.role.findMany.mockResolvedValue([{ id: roleId }]);
      mockPrismaService.module.findMany.mockResolvedValue([
        { name: "User" },
        { name: "Kpi" },
      ]);

      // Mock role permissions with KPI permissions
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        {
          roleId,
          permission: { name: "view:Kpi" },
        },
        {
          roleId,
          permission: { name: "download:Kpi" },
        },
        {
          roleId,
          permission: { name: "print:Kpi" },
        },
        {
          roleId,
          permission: { name: "copy:Kpi" },
        },
      ]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([]);
      mockPrismaService.documentPermission.findMany.mockResolvedValue([]);

      const ability = await factory.createForUser(userId, userRoles);

      // Should have KPI permissions
      expect(ability.can("view", "Kpi")).toBe(true);
      expect(ability.can("download", "Kpi")).toBe(true);
      expect(ability.can("print", "Kpi")).toBe(true);
      expect(ability.can("copy", "Kpi")).toBe(true);
      // Should NOT have edit permission (not granted)
      expect(ability.can("edit", "Kpi")).toBe(false);
    });

    it("should not grant KPI permissions if not assigned", async () => {
      const userId = "user-1";
      const userRoles = ["editor"];
      const roleId = "role-1";

      mockPrismaService.role.findMany.mockResolvedValue([{ id: roleId }]);
      mockPrismaService.module.findMany.mockResolvedValue([
        { name: "User" },
        { name: "Kpi" },
      ]);

      // Mock role permissions without KPI permissions
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        {
          roleId,
          permission: { name: "view:User" },
        },
      ]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([]);
      mockPrismaService.documentPermission.findMany.mockResolvedValue([]);

      const ability = await factory.createForUser(userId, userRoles);

      // Should NOT have any KPI permissions
      expect(ability.can("view", "Kpi")).toBe(false);
      expect(ability.can("download", "Kpi")).toBe(false);
      expect(ability.can("print", "Kpi")).toBe(false);
      expect(ability.can("copy", "Kpi")).toBe(false);
    });

    it("should handle KPI permissions with partial actions", async () => {
      const userId = "user-1";
      const userRoles = ["viewer"];
      const roleId = "role-1";

      mockPrismaService.role.findMany.mockResolvedValue([{ id: roleId }]);
      mockPrismaService.module.findMany.mockResolvedValue([
        { name: "Kpi" },
      ]);

      // Mock role permissions with only view permission
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        {
          roleId,
          permission: { name: "view:Kpi" },
        },
      ]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([]);
      mockPrismaService.documentPermission.findMany.mockResolvedValue([]);

      const ability = await factory.createForUser(userId, userRoles);

      // Should have view permission
      expect(ability.can("view", "Kpi")).toBe(true);
      // Should NOT have other permissions
      expect(ability.can("download", "Kpi")).toBe(false);
      expect(ability.can("print", "Kpi")).toBe(false);
      expect(ability.can("copy", "Kpi")).toBe(false);
      expect(ability.can("create", "Kpi")).toBe(false);
    });

    it("should grant admin full access to KPI", async () => {
      const userId = "user-1";
      const userRoles = ["admin"];

      const ability = await factory.createForUser(userId, userRoles);

      // Admin should have all KPI permissions via manage:all
      expect(ability.can("view", "Kpi")).toBe(true);
      expect(ability.can("download", "Kpi")).toBe(true);
      expect(ability.can("print", "Kpi")).toBe(true);
      expect(ability.can("copy", "Kpi")).toBe(true);
      expect(ability.can("create", "Kpi")).toBe(true);
      expect(ability.can("edit", "Kpi")).toBe(true);
      expect(ability.can("delete", "Kpi")).toBe(true);
    });

    it("should grant boss read-only access to KPI via all subject", async () => {
      const userId = "user-1";
      const userRoles = ["boss"];

      const ability = await factory.createForUser(userId, userRoles);

      // Boss should have view/download/print via "all" subject
      expect(ability.can("view", "Kpi")).toBe(true);
      expect(ability.can("download", "Kpi")).toBe(true);
      expect(ability.can("print", "Kpi")).toBe(true);
      // But not copy/create/edit/delete (not explicitly granted)
      expect(ability.can("copy", "Kpi")).toBe(false);
      expect(ability.can("create", "Kpi")).toBe(false);
      expect(ability.can("edit", "Kpi")).toBe(false);
    });

    it("should ignore invalid KPI permission formats", async () => {
      const userId = "user-1";
      const userRoles = ["editor"];
      const roleId = "role-1";

      mockPrismaService.role.findMany.mockResolvedValue([{ id: roleId }]);
      mockPrismaService.module.findMany.mockResolvedValue([
        { name: "Kpi" },
      ]);

      // Mock role permissions with invalid KPI permission formats
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        {
          roleId,
          permission: { name: "view:Kpi:invalid" }, // Too many parts
        },
        {
          roleId,
          permission: { name: "viewKpi" }, // Missing colon
        },
        {
          roleId,
          permission: { name: "view:Kpi" }, // Valid one
        },
      ]);

      mockPrismaService.folderPermission.findMany.mockResolvedValue([]);
      mockPrismaService.documentPermission.findMany.mockResolvedValue([]);

      const ability = await factory.createForUser(userId, userRoles);

      // Only valid permission should be applied
      expect(ability.can("view", "Kpi")).toBe(true);
      expect(ability.can("download", "Kpi")).toBe(false);
    });
  });
});
