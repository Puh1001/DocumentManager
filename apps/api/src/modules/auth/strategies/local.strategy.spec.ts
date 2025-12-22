import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { LocalStrategy } from "./local.strategy";
import { AuthService } from "../auth.service";
import { UserWithRoles } from "@/common/types/prisma.types";

describe("LocalStrategy", () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

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
    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validate", () => {
    it("should return user when credentials are valid", async () => {
      authService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate("testuser", "password123");

      expect(result).toEqual(mockUser);
      expect(authService.validateUser).toHaveBeenCalledWith(
        "testuser",
        "password123"
      );
    });

    it("should throw UnauthorizedException when validateUser throws", async () => {
      authService.validateUser.mockRejectedValue(
        new UnauthorizedException("Invalid credentials")
      );

      await expect(
        strategy.validate("testuser", "wrong-password")
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when validateUser throws", async () => {
      authService.validateUser.mockRejectedValue(
        new UnauthorizedException("Invalid credentials")
      );

      await expect(
        strategy.validate("testuser", "wrong-password")
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
