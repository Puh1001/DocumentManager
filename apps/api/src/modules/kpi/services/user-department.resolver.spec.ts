import { Test, TestingModule } from "@nestjs/testing";
import { UserDepartmentResolver, ROLES } from "./user-department.resolver";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

type MockUserWithRoles = {
  id: string;
  department: string | null;
  departments?: Array<{
    departmentId: string;
  }>;
  roles: Array<{
    role: {
      name: string;
    };
  }>;
};

type MockPrismaService = {
  department: {
    findFirst: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
};

describe("UserDepartmentResolver", () => {
  let resolver: UserDepartmentResolver;
  let prismaService: MockPrismaService;

  const mockUser: MockUserWithRoles = {
    id: "user-1",
    department: "IT",
    departments: [],
    roles: [
      {
        role: {
          name: "editor",
        },
      },
    ],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      department: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDepartmentResolver,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    resolver = module.get<UserDepartmentResolver>(UserDepartmentResolver);
    prismaService = module.get<PrismaService>(
      PrismaService
    ) as unknown as MockPrismaService;
  });

  describe("resolveDepartmentId", () => {
    it("should return department ID when matched by code", async () => {
      prismaService.department.findFirst.mockResolvedValueOnce({
        id: "dept-1",
      });

      const result = await resolver.resolveDepartmentId("IT");

      expect(result).toBe("dept-1");
      expect(prismaService.department.findFirst).toHaveBeenCalledWith({
        where: {
          code: {
            equals: "IT",
            mode: "insensitive",
          },
          isActive: true,
        },
        select: { id: true },
      });
    });

    it("should return department ID when matched by name (fallback)", async () => {
      prismaService.department.findFirst
        .mockResolvedValueOnce(null) // First call (by code) returns null
        .mockResolvedValueOnce({
          id: "dept-1",
        }); // Second call (by name) returns department

      const result = await resolver.resolveDepartmentId(
        "Information Technology"
      );

      expect(result).toBe("dept-1");
      expect(prismaService.department.findFirst).toHaveBeenCalledTimes(2);
    });

    it("should return null when department string is null", async () => {
      const result = await resolver.resolveDepartmentId(null);

      expect(result).toBeNull();
      expect(prismaService.department.findFirst).not.toHaveBeenCalled();
    });

    it("should return null when department string is empty", async () => {
      const result = await resolver.resolveDepartmentId("");

      expect(result).toBeNull();
      expect(prismaService.department.findFirst).not.toHaveBeenCalled();
    });

    it("should return null when department string is whitespace", async () => {
      const result = await resolver.resolveDepartmentId("   ");

      expect(result).toBeNull();
      expect(prismaService.department.findFirst).not.toHaveBeenCalled();
    });

    it("should return null when no department matches", async () => {
      prismaService.department.findFirst
        .mockResolvedValueOnce(null) // By code
        .mockResolvedValueOnce(null); // By name

      const result = await resolver.resolveDepartmentId("NonExistent");

      expect(result).toBeNull();
      expect(prismaService.department.findFirst).toHaveBeenCalledTimes(2);
    });

    it("should trim department string before matching", async () => {
      prismaService.department.findFirst.mockResolvedValueOnce({
        id: "dept-1",
      });

      const result = await resolver.resolveDepartmentId("  IT  ");

      expect(result).toBe("dept-1");
      expect(prismaService.department.findFirst).toHaveBeenCalledWith({
        where: {
          code: {
            equals: "IT",
            mode: "insensitive",
          },
          isActive: true,
        },
        select: { id: true },
      });
    });

    it("should handle database errors gracefully", async () => {
      prismaService.department.findFirst.mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await resolver.resolveDepartmentId("IT");

      expect(result).toBeNull();
    });
  });

  describe("getUserWithDepartment", () => {
    it("should return user with resolved department ID", async () => {
      prismaService.user.findUnique.mockResolvedValueOnce(
        mockUser as MockUserWithRoles
      );
      prismaService.department.findFirst.mockResolvedValueOnce({
        id: "dept-1",
      });

      const result = await resolver.getUserWithDepartment("user-1");

      expect(result).toEqual({
        userId: "user-1",
        departmentId: "dept-1",
        roles: ["editor"],
        isAdmin: false,
        isBoss: false,
        isKpiViewerAll: false,
      });
    });

    it("should return null departmentId when user has no department", async () => {
      const userWithoutDept: MockUserWithRoles = {
        ...mockUser,
        department: null,
      };
      prismaService.user.findUnique.mockResolvedValueOnce(userWithoutDept);

      const result = await resolver.getUserWithDepartment("user-1");

      expect(result.departmentId).toBeNull();
    });

    it("should identify admin user correctly", async () => {
      const adminUser: MockUserWithRoles = {
        ...mockUser,
        roles: [
          {
            role: {
              name: ROLES.ADMIN,
            },
          },
        ],
      };
      prismaService.user.findUnique.mockResolvedValueOnce(adminUser);
      prismaService.department.findFirst.mockResolvedValueOnce({
        id: "dept-1",
      });

      const result = await resolver.getUserWithDepartment("user-1");

      expect(result.isAdmin).toBe(true);
      expect(result.isBoss).toBe(false);
    });

    it("should identify boss user correctly", async () => {
      const bossUser: MockUserWithRoles = {
        ...mockUser,
        roles: [
          {
            role: {
              name: ROLES.BOSS,
            },
          },
        ],
      };
      prismaService.user.findUnique.mockResolvedValueOnce(bossUser);
      prismaService.department.findFirst.mockResolvedValueOnce({
        id: "dept-1",
      });

      const result = await resolver.getUserWithDepartment("user-1");

      expect(result.isAdmin).toBe(false);
      expect(result.isBoss).toBe(true);
    });

    it("should throw CustomException when user not found", async () => {
      prismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        resolver.getUserWithDepartment("non-existent")
      ).rejects.toThrow(CustomException);

      await expect(
        resolver.getUserWithDepartment("non-existent")
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.USER.NOT_FOUND,
      });
    });

    it("should throw CustomException when userId is invalid (empty)", async () => {
      await expect(resolver.getUserWithDepartment("")).rejects.toThrow(
        CustomException
      );

      await expect(resolver.getUserWithDepartment("")).rejects.toMatchObject({
        errorCode: ErrorCodes.USER.INVALID_ID,
      });
    });

    it("should throw CustomException when userId is invalid (whitespace)", async () => {
      await expect(resolver.getUserWithDepartment("   ")).rejects.toThrow(
        CustomException
      );

      await expect(resolver.getUserWithDepartment("   ")).rejects.toMatchObject(
        {
          errorCode: ErrorCodes.USER.INVALID_ID,
        }
      );
    });

    it("should throw CustomException when userId is null", async () => {
      await expect(
        resolver.getUserWithDepartment(null as unknown as string)
      ).rejects.toThrow(CustomException);

      await expect(
        resolver.getUserWithDepartment(null as unknown as string)
      ).rejects.toMatchObject({
        errorCode: ErrorCodes.USER.INVALID_ID,
      });
    });
  });

  describe("hasFullAccess", () => {
    it("should return true for admin role", () => {
      expect(resolver.hasFullAccess([ROLES.ADMIN])).toBe(true);
    });

    it("should return true for boss role", () => {
      expect(resolver.hasFullAccess([ROLES.BOSS])).toBe(true);
    });

    it("should return true for user with both admin and boss roles", () => {
      expect(resolver.hasFullAccess([ROLES.ADMIN, ROLES.BOSS])).toBe(true);
    });

    it("should return false for regular roles", () => {
      expect(resolver.hasFullAccess(["editor", "viewer"])).toBe(false);
    });

    it("should return false for empty roles array", () => {
      expect(resolver.hasFullAccess([])).toBe(false);
    });
  });
});
