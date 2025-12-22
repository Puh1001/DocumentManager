import { Test, TestingModule } from "@nestjs/testing";
import { JwtStrategy } from "./jwt.strategy";
import { ConfigService } from "@nestjs/config";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue("test-secret-key"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validate", () => {
    it("should return user payload from JWT token", async () => {
      const mockPayload = {
        sub: "user-1",
        username: "testuser",
        roles: ["user", "admin"],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        id: "user-1",
        username: "testuser",
        roles: ["user", "admin"],
      });
    });

    it("should handle payload with empty roles", async () => {
      const mockPayload = {
        sub: "user-1",
        username: "testuser",
        roles: [],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        id: "user-1",
        username: "testuser",
        roles: [],
      });
    });
  });

  describe("constructor", () => {
    it("should throw error when JWT_SECRET is not set", () => {
      const mockConfigServiceWithoutSecret = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new JwtStrategy(
          mockConfigServiceWithoutSecret as unknown as ConfigService
        );
      }).toThrow("JWT_SECRET environment variable is not set");
    });
  });
});
