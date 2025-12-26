import { Test, TestingModule } from "@nestjs/testing";
import { RoleController } from "./role.controller";
import { RoleService } from "../services/role.service";
import { CreateRoleDto } from "../dto/create-role.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";
import { PoliciesGuard } from "../guards/policies.guard";
import { CaslAbilityFactory } from "../factories/casl-ability.factory";
import { PrismaService } from "@/common/prisma/prisma.service";
import { Reflector } from "@nestjs/core";
import { AuthenticatedRequest } from "@/common/types/request.types";

describe("RoleController", () => {
  let controller: RoleController;
  let service: RoleService;

  const mockRoleService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPoliciesGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRequest = {
    user: {
      id: "user-1",
      username: "admin",
      roles: ["admin"],
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: mockRoleService,
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

    controller = module.get<RoleController>(RoleController);
    service = module.get<RoleService>(RoleService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new role", async () => {
      const dto: CreateRoleDto = {
        name: "custom-role",
        description: "Custom role",
      };
      const mockRole = {
        id: "role-1",
        ...dto,
        createdAt: new Date(),
      };

      mockRoleService.create.mockResolvedValue(mockRole);

      const result = await controller.create(dto, mockRequest);

      expect(result).toEqual(mockRole);
      expect(service.create).toHaveBeenCalledWith(dto, mockRequest.user.id);
    });
  });

  describe("findAll", () => {
    it("should return paginated roles", async () => {
      const mockResult = {
        data: [{ id: "role-1", name: "editor" }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockRoleService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll({ page: 1, limit: 20 });

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });

  describe("findOne", () => {
    it("should return role by id", async () => {
      const roleId = "role-1";
      const mockRole = {
        id: roleId,
        name: "editor",
        permissions: [],
      };

      mockRoleService.findById.mockResolvedValue(mockRole);

      const result = await controller.findOne(roleId);

      expect(result).toEqual(mockRole);
      expect(service.findById).toHaveBeenCalledWith(roleId);
    });
  });

  describe("update", () => {
    it("should update role", async () => {
      const roleId = "role-1";
      const dto: UpdateRoleDto = {
        description: "Updated description",
      };
      const mockRole = {
        id: roleId,
        name: "editor",
        ...dto,
      };

      mockRoleService.update.mockResolvedValue(mockRole);

      const result = await controller.update(roleId, dto, mockRequest);

      expect(result).toEqual(mockRole);
      expect(service.update).toHaveBeenCalledWith(
        roleId,
        dto,
        mockRequest.user.id
      );
    });
  });

  describe("remove", () => {
    it("should delete role", async () => {
      const roleId = "role-1";
      const mockResult = { message: "Role deleted successfully" };

      mockRoleService.delete.mockResolvedValue(mockResult);

      const result = await controller.remove(roleId, mockRequest);

      expect(result).toEqual(mockResult);
      expect(service.delete).toHaveBeenCalledWith(roleId, mockRequest.user.id);
    });
  });
});
