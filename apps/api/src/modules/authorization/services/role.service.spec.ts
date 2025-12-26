import { Test, TestingModule } from "@nestjs/testing";
import { CustomException } from "@/common/errors/custom-exception";
import { RoleService } from "./role.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CreateRoleDto } from "../dto/create-role.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";

describe("RoleService", () => {
  let service: RoleService;

  const mockPrismaService = {
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new role", async () => {
      const dto: CreateRoleDto = {
        name: "custom-role",
        description: "Custom role description",
      };
      const mockRole = {
        id: "role-1",
        name: dto.name,
        description: dto.description,
        createdAt: new Date(),
      };

      mockPrismaService.role.findUnique.mockResolvedValue(null);
      mockPrismaService.role.create.mockResolvedValue(mockRole);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.create(dto, "user-1");

      expect(result).toEqual(mockRole);
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { name: dto.name },
      });
      expect(mockPrismaService.role.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
        },
      });
    });

    it("should throw ConflictException when role name exists", async () => {
      const dto: CreateRoleDto = {
        name: "existing-role",
        description: "Description",
      };

      mockPrismaService.role.findUnique.mockResolvedValue({
        id: "role-1",
        name: dto.name,
      });

      await expect(service.create(dto)).rejects.toThrow(CustomException);
    });
  });

  describe("findAll", () => {
    it("should return paginated roles", async () => {
      const mockRoles = [
        {
          id: "role-1",
          name: "editor",
          description: "Editor role",
          _count: { users: 2, permissions: 3 },
        },
      ];

      mockPrismaService.role.findMany.mockResolvedValue(mockRoles);
      mockPrismaService.role.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toEqual(mockRoles);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should filter by search term", async () => {
      const mockRoles = [
        {
          id: "role-1",
          name: "editor",
          description: "Editor role",
          _count: { users: 0, permissions: 0 },
        },
      ];

      mockPrismaService.role.findMany.mockResolvedValue(mockRoles);
      mockPrismaService.role.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 20, search: "editor" });

      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: "editor", mode: "insensitive" } },
              { description: { contains: "editor", mode: "insensitive" } },
            ]),
          }),
        })
      );
    });
  });

  describe("findById", () => {
    it("should return role with permissions", async () => {
      const roleId = "role-1";
      const mockRole = {
        id: roleId,
        name: "editor",
        description: "Editor role",
        permissions: [
          {
            permission: { id: "perm-1", name: "view" },
          },
        ],
        _count: { users: 1, permissions: 1 },
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

      const result = await service.findById(roleId);

      expect(result.id).toBe(roleId);
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0]).toEqual({ id: "perm-1", name: "view" });
    });

    it("should throw NotFoundException when role not found", async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.findById("non-existent")).rejects.toThrow(
        CustomException
      );
    });
  });

  describe("update", () => {
    it("should update role", async () => {
      const roleId = "role-1";
      const existingRole = {
        id: roleId,
        name: "old-name",
        description: "Old description",
      };
      const dto: UpdateRoleDto = {
        name: "new-name",
        description: "New description",
      };
      const updatedRole = {
        ...existingRole,
        ...dto,
      };

      mockPrismaService.role.findUnique
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(null);
      mockPrismaService.role.update.mockResolvedValue(updatedRole);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.update(roleId, dto, "user-1");

      expect(result).toEqual(updatedRole);
      expect(mockPrismaService.role.update).toHaveBeenCalled();
    });

    it("should throw ConflictException when new name exists", async () => {
      const roleId = "role-1";
      const existingRole = {
        id: roleId,
        name: "old-name",
        description: "Old description",
      };
      const dto: UpdateRoleDto = {
        name: "existing-name",
      };

      mockPrismaService.role.findUnique
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce({ id: "other-role", name: "existing-name" });

      await expect(service.update(roleId, dto)).rejects.toThrow(
        CustomException
      );
    });
  });

  describe("delete", () => {
    it("should delete role when not in use", async () => {
      const roleId = "role-1";
      const mockRole = {
        id: roleId,
        name: "custom-role",
        description: "Custom role",
        _count: { users: 0, permissions: 0 },
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.role.delete.mockResolvedValue(mockRole);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.delete(roleId, "user-1");

      expect(result.message).toBe("Role deleted successfully");
      expect(mockPrismaService.role.delete).toHaveBeenCalledWith({
        where: { id: roleId },
      });
    });

    it("should throw BadRequestException when role is system role", async () => {
      const roleId = "role-1";
      const mockRole = {
        id: roleId,
        name: "admin",
        description: "Admin role",
        _count: { users: 0, permissions: 0 },
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

      await expect(service.delete(roleId)).rejects.toThrow(CustomException);
    });

    it("should throw BadRequestException when role is in use", async () => {
      const roleId = "role-1";
      const mockRole = {
        id: roleId,
        name: "custom-role",
        description: "Custom role",
        _count: { users: 2, permissions: 1 },
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

      await expect(service.delete(roleId)).rejects.toThrow(CustomException);
    });
  });
});
