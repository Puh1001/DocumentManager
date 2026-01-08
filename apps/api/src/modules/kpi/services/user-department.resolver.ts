import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

export const ROLES = {
  ADMIN: "admin",
  BOSS: "boss",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

// Legacy interface - kept for backward compatibility
export interface UserWithDepartment {
  userId: string;
  departmentId: string | null;
  roles: string[];
  isAdmin: boolean;
  isBoss: boolean;
}

// NEW: Multi-department interface
export interface UserWithDepartments {
  userId: string;
  departmentIds: string[]; // Array of department IDs
  roles: string[];
  isAdmin: boolean;
  isBoss: boolean;
}

@Injectable()
export class UserDepartmentResolver {
  private readonly logger = new Logger(UserDepartmentResolver.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve user's department ID from department string field.
   * Tries to match by Department.code first, then by Department.name (case-insensitive).
   *
   * @param userDepartment - Department string from User.department field
   * @returns Department ID if found, null otherwise
   * @throws Never throws - returns null on errors for graceful degradation
   */
  async resolveDepartmentId(
    userDepartment: string | null
  ): Promise<string | null> {
    // Handle null/empty cases
    if (!userDepartment || userDepartment.trim() === "") {
      return null;
    }

    const trimmed = userDepartment.trim();

    try {
      // Primary: Try to match by code (case-insensitive)
      const byCode = await this.prisma.department.findFirst({
        where: {
          code: {
            equals: trimmed,
            mode: "insensitive",
          },
          isActive: true,
        },
        select: { id: true },
      });

      if (byCode) {
        return byCode.id;
      }

      // Fallback: Try to match by name (case-insensitive)
      // Note: We search by the main name field which stores Vietnamese name by default
      const byName = await this.prisma.department.findFirst({
        where: {
          name: {
            equals: trimmed,
            mode: "insensitive",
          },
          isActive: true,
        },
        select: { id: true },
      });

      if (byName) {
        return byName.id;
      }

      // No match found
      this.logger.warn(
        `Department not found for user department string: "${trimmed}"`
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error resolving department ID for "${trimmed}":`,
        error
      );
      return null;
    }
  }

  /**
   * Get user with resolved department IDs (from junction table) and role information.
   *
   * @param userId - User ID
   * @returns UserWithDepartments object with multiple departments and roles
   * @throws {CustomException} When user ID is invalid or user is not found
   */
  async getUserWithDepartments(userId: string): Promise<UserWithDepartments> {
    // Validate input
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      throw CustomException.badRequest(
        ErrorCodes.USER.INVALID_ID,
        "Invalid user ID"
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        department: true, // Legacy field
        departments: {
          // NEW: Junction table
          select: {
            departmentId: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw CustomException.notFound(
        ErrorCodes.USER.NOT_FOUND,
        `User with ID ${userId} not found`
      );
    }

    const roleNames = user.roles.map((ur) => ur.role.name);

    // Get department IDs from junction table
    let departmentIds = user.departments.map((d) => d.departmentId);

    // Fallback to legacy field if no departments in junction table
    if (departmentIds.length === 0 && user.department) {
      const legacyDeptId = await this.resolveDepartmentId(user.department);
      if (legacyDeptId) {
        departmentIds = [legacyDeptId];
      }
    }

    return {
      userId: user.id,
      departmentIds,
      roles: roleNames,
      isAdmin: roleNames.includes(ROLES.ADMIN),
      isBoss: roleNames.includes(ROLES.BOSS),
    };
  }

  /**
   * Get user with resolved department ID and role information (LEGACY).
   * @deprecated Use getUserWithDepartments() instead
   *
   * @param userId - User ID
   * @returns UserWithDepartment object with resolved department and roles
   * @throws {CustomException} When user ID is invalid or user is not found
   */
  async getUserWithDepartment(userId: string): Promise<UserWithDepartment> {
    const userWithDepts = await this.getUserWithDepartments(userId);

    // Return first department for backward compatibility
    return {
      userId: userWithDepts.userId,
      departmentId: userWithDepts.departmentIds[0] || null,
      roles: userWithDepts.roles,
      isAdmin: userWithDepts.isAdmin,
      isBoss: userWithDepts.isBoss,
    };
  }

  /**
   * Check if user has full access (admin or boss role).
   *
   * @param roles - Array of role names
   * @returns true if user is admin or boss
   */
  hasFullAccess(roles: string[]): boolean {
    return roles.includes(ROLES.ADMIN) || roles.includes(ROLES.BOSS);
  }
}
