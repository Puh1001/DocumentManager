import { Test, TestingModule } from "@nestjs/testing";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { PoliciesGuard } from "../authorization/guards/policies.guard";
import { CaslAbilityFactory } from "../authorization/factories/casl-ability.factory";
import { PrismaService } from "@/common/prisma/prisma.service";
import { Reflector } from "@nestjs/core";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

describe("UsersController", () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    assignRole: jest.fn(),
    removeRole: jest.fn(),
  };

  const mockPoliciesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
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

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new user", async () => {
      const dto: CreateUserDto = {
        username: "newuser",
        email: "newuser@test.com",
        password: "password123",
        fullName: "New User",
      };
      const mockUser = {
        id: "user-1",
        ...dto,
        isActive: true,
        createdAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(dto);

      expect(result).toEqual(mockUser);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe("findAll", () => {
    it("should return paginated users", async () => {
      const mockResult = {
        data: [{ id: "user-1", username: "user1" }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockUsersService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll({ page: 1, limit: 20 });

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });

  describe("findOne", () => {
    it("should return user by id", async () => {
      const userId = "user-1";
      const mockUser = {
        id: userId,
        username: "user1",
        email: "user1@test.com",
        roles: [],
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.findOne(userId);

      expect(result).toEqual(mockUser);
      expect(service.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe("update", () => {
    it("should update user", async () => {
      const userId = "user-1";
      const dto: UpdateUserDto = {
        fullName: "Updated Name",
      };
      const mockUser = {
        id: userId,
        username: "user1",
        ...dto,
      };

      mockUsersService.update.mockResolvedValue(mockUser);

      const result = await controller.update(userId, dto);

      expect(result).toEqual(mockUser);
      expect(service.update).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe("remove", () => {
    it("should deactivate user", async () => {
      const userId = "user-1";
      const mockUser = {
        id: userId,
        username: "user1",
        isActive: false,
      };

      mockUsersService.deactivate.mockResolvedValue(mockUser);

      const result = await controller.remove(userId);

      expect(result).toEqual(mockUser);
      expect(service.deactivate).toHaveBeenCalledWith(userId);
    });
  });

  describe("assignRole", () => {
    it("should assign role to user", async () => {
      const userId = "user-1";
      const roleId = "role-1";
      const mockResult = {
        userId,
        roleId,
        role: { id: roleId, name: "editor" },
      };

      mockUsersService.assignRole.mockResolvedValue(mockResult);

      const result = await controller.assignRole(userId, roleId);

      expect(result).toEqual(mockResult);
      expect(service.assignRole).toHaveBeenCalledWith(userId, roleId);
    });
  });

  describe("removeRole", () => {
    it("should remove role from user", async () => {
      const userId = "user-1";
      const roleId = "role-1";

      mockUsersService.removeRole.mockResolvedValue({});

      await controller.removeRole(userId, roleId);

      expect(service.removeRole).toHaveBeenCalledWith(userId, roleId);
    });
  });
});
