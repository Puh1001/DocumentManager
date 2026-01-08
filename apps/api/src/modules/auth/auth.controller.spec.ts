import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { UserWithRolesAndDepartments } from "@/common/types/prisma.types";
import { AuthenticatedRequest } from "@/common/types/request.types";
import type { Request as ExpressRequest } from "express";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser: UserWithRolesAndDepartments = {
    id: "user-1",
    username: "testuser",
    email: "test@example.com",
    passwordHash: "hashed-password",
    fullName: "Test User",
    department: "IT",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    roles: [
      {
        userId: "user-1",
        roleId: "role-1",
        assignedAt: new Date(),
        role: {
          id: "role-1",
          name: "user",
          description: "Regular user",
          createdAt: new Date(),
        },
      },
    ],
    departments: [], // NEW: Multi-department support
  };

  const mockLoginResponse = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: {
      id: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
      fullName: mockUser.fullName,
      department: mockUser.department,
      departments: [], // NEW: Multi-department support
      roles: ["user"],
    },
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("should return login response with tokens", async () => {
      const loginDto: LoginDto = {
        username: "testuser",
        password: "password123",
      };

      const mockRequest: ExpressRequest & { user: UserWithRolesAndDepartments } = {
        user: mockUser,
        ip: "127.0.0.1",
        headers: {
          "user-agent": "Mozilla/5.0",
        },
      } as ExpressRequest & { user: UserWithRolesAndDepartments };

      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(mockRequest, loginDto);

      expect(result).toEqual(mockLoginResponse);
      expect(authService.login).toHaveBeenCalledWith(
        mockUser,
        "127.0.0.1",
        "Mozilla/5.0"
      );
    });

    it("should handle login without ip and user-agent", async () => {
      const loginDto: LoginDto = {
        username: "testuser",
        password: "password123",
      };

      const mockRequest: ExpressRequest & { user: UserWithRolesAndDepartments } = {
        user: mockUser,
        ip: undefined,
        headers: {},
      } as ExpressRequest & { user: UserWithRolesAndDepartments };

      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(mockRequest, loginDto);

      expect(result).toEqual(mockLoginResponse);
      expect(authService.login).toHaveBeenCalledWith(
        mockUser,
        undefined,
        undefined
      );
    });
  });

  describe("refresh", () => {
    it("should refresh tokens", async () => {
      const refreshDto: RefreshDto = {
        refreshToken: "old-refresh-token",
      };

      authService.refreshTokens.mockResolvedValue(mockLoginResponse);

      const result = await controller.refresh(refreshDto);

      expect(result).toEqual(mockLoginResponse);
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        refreshDto.refreshToken
      );
    });
  });

  describe("logout", () => {
    it("should logout user and return success message", async () => {
      const mockRequest: AuthenticatedRequest = {
        user: {
          id: "user-1",
          username: "testuser",
          roles: ["user"],
        },
      } as AuthenticatedRequest;

      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest);

      expect(result).toEqual({ message: "Logged out successfully" });
      expect(authService.logout).toHaveBeenCalledWith("user-1");
    });
  });

  describe("me", () => {
    it("should return current user profile", async () => {
      const mockRequest: AuthenticatedRequest = {
        user: {
          id: "user-1",
          username: "testuser",
          roles: ["user"],
        },
      } as AuthenticatedRequest;

      const mockProfile = {
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
        fullName: "Test User",
        department: "IT",
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: null,
        roles: [
          {
            id: "role-1",
            name: "user",
            description: "Regular user",
            createdAt: new Date(),
          },
        ],
        departments: [], // NEW: Multi-department support
      };

      authService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.me(mockRequest);

      expect(result).toEqual(mockProfile);
      expect(authService.getProfile).toHaveBeenCalledWith("user-1");
    });
  });
});
