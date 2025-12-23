import { Test, TestingModule } from "@nestjs/testing";
import { CustomException } from "@/common/errors/custom-exception";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { PrismaService } from "@/common/prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { UserWithRoles } from "@/common/types/prisma.types";

// Mock argon2
jest.mock("argon2");
const mockArgon2 = argon2 as jest.Mocked<typeof argon2>;

describe("AuthService", () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: UserWithRoles = {
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
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const mockUsersService = {
      findById: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // Setup default mocks
    mockArgon2.verify.mockResolvedValue(true);
    jwtService.sign.mockReturnValue("mock-token");
    configService.get.mockReturnValue("7d");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validateUser", () => {
    it("should return user when credentials are valid", async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockArgon2.verify.mockResolvedValue(true);

      const result = await service.validateUser("testuser", "password123");

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: "testuser" },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });
      expect(mockArgon2.verify).toHaveBeenCalledWith(
        "hashed-password",
        "password123"
      );
    });

    it("should throw UnauthorizedException when user not found", async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.validateUser("nonexistent", "password123")
      ).rejects.toThrow(CustomException);
      expect(mockArgon2.verify).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException when user is inactive", async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      prismaService.user.findUnique = jest.fn().mockResolvedValue(inactiveUser);

      await expect(
        service.validateUser("testuser", "password123")
      ).rejects.toThrow(CustomException);
      expect(mockArgon2.verify).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException when password is invalid", async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockArgon2.verify.mockResolvedValue(false);

      await expect(
        service.validateUser("testuser", "wrong-password")
      ).rejects.toThrow(CustomException);
      expect(mockArgon2.verify).toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should create tokens and session on successful login", async () => {
      const ipAddress = "127.0.0.1";
      const userAgent = "Mozilla/5.0";

      jwtService.sign
        .mockReturnValueOnce("access-token")
        .mockReturnValueOnce("refresh-token");

      prismaService.session.create = jest.fn().mockResolvedValue({
        id: "session-1",
        refreshToken: "refresh-token",
      });
      prismaService.user.update = jest.fn().mockResolvedValue(mockUser);
      prismaService.auditLog.create = jest.fn().mockResolvedValue({
        id: "audit-1",
      });

      const result = await service.login(mockUser, ipAddress, userAgent);

      expect(result).toHaveProperty("accessToken", "access-token");
      expect(result).toHaveProperty("refreshToken", "refresh-token");
      expect(result.user).toMatchObject({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        fullName: mockUser.fullName,
        department: mockUser.department,
        roles: ["user"],
      });

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          refreshToken: "refresh-token",
          ipAddress,
          userAgent,
          expiresAt: expect.any(Date),
        },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          action: "LOGIN",
          ipAddress,
          userAgent,
        },
      });
    });

    it("should work without ipAddress and userAgent", async () => {
      jwtService.sign
        .mockReturnValueOnce("access-token")
        .mockReturnValueOnce("refresh-token");

      prismaService.session.create = jest.fn().mockResolvedValue({
        id: "session-1",
      });
      prismaService.user.update = jest.fn().mockResolvedValue(mockUser);
      prismaService.auditLog.create = jest.fn().mockResolvedValue({
        id: "audit-1",
      });

      const result = await service.login(mockUser);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          ipAddress: undefined,
          userAgent: undefined,
        }),
      });
    });
  });

  describe("refreshTokens", () => {
    it("should refresh tokens and rotate refresh token", async () => {
      const refreshToken = "old-refresh-token";
      const mockSession = {
        id: "session-1",
        userId: mockUser.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        user: mockUser,
      };

      prismaService.session.findUnique = jest
        .fn()
        .mockResolvedValue(mockSession);
      prismaService.session.delete = jest.fn().mockResolvedValue(mockSession);
      jwtService.sign
        .mockReturnValueOnce("new-access-token")
        .mockReturnValueOnce("new-refresh-token");
      prismaService.session.create = jest.fn().mockResolvedValue({
        id: "session-2",
      });
      prismaService.user.update = jest.fn().mockResolvedValue(mockUser);
      prismaService.auditLog.create = jest.fn().mockResolvedValue({
        id: "audit-1",
      });

      const result = await service.refreshTokens(refreshToken);

      expect(result).toHaveProperty("accessToken", "new-access-token");
      expect(result).toHaveProperty("refreshToken", "new-refresh-token");
      expect(prismaService.session.delete).toHaveBeenCalledWith({
        where: { id: mockSession.id },
      });
      expect(prismaService.session.create).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException when session not found", async () => {
      prismaService.session.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.refreshTokens("invalid-token")).rejects.toThrow(
        CustomException
      );
      expect(prismaService.session.delete).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException when session expired", async () => {
      const expiredSession = {
        id: "session-1",
        userId: mockUser.id,
        refreshToken: "expired-token",
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: mockUser,
      };

      prismaService.session.findUnique = jest
        .fn()
        .mockResolvedValue(expiredSession);

      await expect(service.refreshTokens("expired-token")).rejects.toThrow(
        CustomException
      );
      expect(prismaService.session.delete).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("should delete all user sessions and create audit log", async () => {
      const userId = "user-1";
      prismaService.session.deleteMany = jest.fn().mockResolvedValue({
        count: 2,
      });
      prismaService.auditLog.create = jest.fn().mockResolvedValue({
        id: "audit-1",
      });

      await service.logout(userId);

      expect(prismaService.session.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: "LOGOUT",
        },
      });
    });
  });

  describe("getProfile", () => {
    it("should return user profile", async () => {
      const userId = "user-1";
      const mockProfile = {
        id: userId,
        username: "testuser",
        email: "test@example.com",
        fullName: "Test User",
        department: "IT",
        isActive: true,
        roles: [{ id: "role-1", name: "user" }],
      };

      usersService.findById = jest.fn().mockResolvedValue(mockProfile);

      const result = await service.getProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(usersService.findById).toHaveBeenCalledWith(userId);
    });

    it("should throw UnauthorizedException when user not found", async () => {
      const userId = "nonexistent";
      usersService.findById = jest.fn().mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow(CustomException);
    });
  });
});
