import { Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";

/**
 * Utility for getting system user ID for automated operations
 * Caches result to avoid repeated database queries
 */
export class SystemUserUtil {
  private static readonly logger = new Logger(SystemUserUtil.name);
  private static systemUserIdCache: string | null = null;

  /**
   * Get system user ID for automated operations
   * Returns first admin user or first user
   * Cache result để tránh query nhiều lần
   */
  static async getSystemUserId(prisma: PrismaService): Promise<string> {
    // Return cached value if available
    if (this.systemUserIdCache) {
      return this.systemUserIdCache;
    }

    try {
      // Try to find admin user
      const adminUser = await (prisma as PrismaClientLike).user.findFirst({
        where: {
          roles: {
            some: {
              role: {
                name: "admin",
              },
            },
          },
        },
      });

      if (adminUser) {
        this.systemUserIdCache = adminUser.id;
        return adminUser.id;
      }

      // Fallback: get first user
      const firstUser = await (prisma as PrismaClientLike).user.findFirst({
        orderBy: { createdAt: "asc" },
      });

      if (firstUser) {
        this.systemUserIdCache = firstUser.id;
        return firstUser.id;
      }

      // No user found - this should not happen in production
      // But we'll log warning and throw error
      this.logger.error(
        "No user found in database. Please run seed script or create a user first."
      );
      throw new Error("No user found in database. Please create a user first.");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to get system user ID: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Clear cache (useful for testing or when users are added)
   */
  static clearCache(): void {
    this.systemUserIdCache = null;
  }
}
