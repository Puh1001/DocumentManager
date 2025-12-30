import { Test, TestingModule } from "@nestjs/testing";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { ModuleService } from "./module.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PermissionService } from "./permission.service";

describe("ModuleService", () => {
  let service: ModuleService;

  const mockPrismaService = {
    module: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockPermissionService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    }).compile();

    service = module.get<ModuleService>(ModuleService);

    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all active modules", async () => {
      const mockModules = [
        {
          id: "1",
          name: "User",
          displayName: "User Management",
          isActive: true,
        },
        {
          id: "2",
          name: "Department",
          displayName: "Department Management",
          isActive: true,
        },
      ];

      mockPrismaService.module.findMany.mockResolvedValue(mockModules);

      const result = await service.findAll();

      expect(result).toEqual(mockModules);
      expect(mockPrismaService.module.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("findOne", () => {
    it("should return a module by id", async () => {
      const mockModule = {
        id: "1",
        name: "User",
        displayName: "User Management",
        isActive: true,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);

      const result = await service.findOne("1");

      expect(result).toEqual(mockModule);
      expect(mockPrismaService.module.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
      });
    });

    it("should throw NotFoundException if module not found", async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(null);

      await expect(service.findOne("999")).rejects.toThrow(CustomException);
      await expect(service.findOne("999")).rejects.toThrow(
        expect.objectContaining({
          errorCode: ErrorCodes.MODULE.NOT_FOUND,
        })
      );
    });
  });

  describe("create", () => {
    it("should create a new module and auto-generate permissions", async () => {
      const dto = {
        name: "TestModule",
        displayName: "Test Module",
        description: "Test description",
      };

      const mockModule = {
        id: "1",
        ...dto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.module.findUnique.mockResolvedValue(null);

      // Mock transaction - it receives a callback function
      mockPrismaService.$transaction.mockImplementation(
        async (
          callback: (tx: {
            module: { create: jest.Mock };
            permission: { findUnique: jest.Mock; create: jest.Mock };
          }) => Promise<unknown>
        ) => {
          // Create a mock transaction client
          const mockTx = {
            module: {
              create: jest.fn().mockResolvedValue(mockModule),
            },
            permission: {
              findUnique: jest.fn().mockResolvedValue(null), // Permission doesn't exist
              create: jest.fn().mockResolvedValue({}), // Create permission
            },
          };
          return callback(mockTx);
        }
      );
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.create(dto, "user-1");

      expect(result).toEqual(mockModule);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it("should throw ConflictException if module name exists", async () => {
      const dto = {
        name: "User",
        displayName: "User Management",
      };

      mockPrismaService.module.findUnique.mockResolvedValue({
        id: "1",
        name: "User",
      });

      await expect(service.create(dto)).rejects.toThrow(CustomException);
      await expect(service.create(dto)).rejects.toThrow(
        expect.objectContaining({
          errorCode: ErrorCodes.MODULE.NAME_EXISTS,
        })
      );
    });
  });

  describe("update", () => {
    it("should update a module", async () => {
      const existingModule = {
        id: "1",
        name: "User",
        displayName: "User Management",
        description: "Old description",
        isActive: true,
      };

      const dto = {
        displayName: "Updated User Management",
        description: "New description",
      };

      const updatedModule = {
        ...existingModule,
        ...dto,
      };

      mockPrismaService.module.findUnique
        .mockResolvedValueOnce(existingModule) // findOne call
        .mockResolvedValueOnce(null); // name conflict check
      mockPrismaService.module.update.mockResolvedValue(updatedModule);

      const result = await service.update("1", dto, "user-1");

      expect(result).toEqual(updatedModule);
      expect(mockPrismaService.module.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: dto,
      });
    });

    it("should throw NotFoundException if module not found", async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(null);

      await expect(service.update("999", {})).rejects.toThrow(CustomException);
      await expect(service.update("999", {})).rejects.toThrow(
        expect.objectContaining({
          errorCode: ErrorCodes.MODULE.NOT_FOUND,
        })
      );
    });
  });

  describe("remove", () => {
    it("should soft delete a module", async () => {
      const module = {
        id: "1",
        name: "TestModule",
        displayName: "Test Module",
        isActive: true,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(module);
      mockPrismaService.permission.findMany.mockResolvedValue([]);
      mockPrismaService.module.update.mockResolvedValue({
        ...module,
        isActive: false,
      });

      const result = await service.remove("1", "user-1");

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.module.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { isActive: false },
      });
    });

    it("should throw ConflictException if module has assigned permissions", async () => {
      const module = {
        id: "1",
        name: "User",
        displayName: "User Management",
      };

      mockPrismaService.module.findUnique.mockResolvedValue(module);
      mockPrismaService.permission.findMany.mockResolvedValue([
        {
          id: "perm-1",
          name: "view:User",
          rolePermissions: [{ roleId: "role-1" }],
        },
      ]);

      await expect(service.remove("1")).rejects.toThrow(CustomException);
      await expect(service.remove("1")).rejects.toThrow(
        expect.objectContaining({
          errorCode: ErrorCodes.MODULE.IN_USE,
        })
      );
    });
  });

  describe("autoGeneratePermissions", () => {
    it("should create 5 standard permissions for a module", async () => {
      mockPermissionService.create.mockResolvedValue({});

      await service.autoGeneratePermissions("TestModule");

      expect(mockPermissionService.create).toHaveBeenCalledTimes(5);
      expect(mockPermissionService.create).toHaveBeenCalledWith(
        {
          name: "view:TestModule",
          description: "View TestModule module",
        },
        undefined
      );
      expect(mockPermissionService.create).toHaveBeenCalledWith(
        {
          name: "create:TestModule",
          description: "Create TestModule module",
        },
        undefined
      );
    });

    it("should skip if permission already exists", async () => {
      mockPermissionService.create
        .mockRejectedValueOnce(
          CustomException.conflict(ErrorCodes.PERMISSION.NAME_EXISTS, "Exists")
        )
        .mockResolvedValue({});

      await service.autoGeneratePermissions("TestModule");

      expect(mockPermissionService.create).toHaveBeenCalledTimes(5);
    });
  });
});
