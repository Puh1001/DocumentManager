import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Type assertion to help TypeScript recognize UserDepartment model
// This is a workaround for IDE type caching issues
type PrismaClientWithUserDepartment = PrismaClient & {
  userDepartment: PrismaClient["user"];
};

interface MigrationStats {
  totalUsers: number;
  usersWithDepartment: number;
  successfulMigrations: number;
  failedMigrations: number;
  unresolvedDepartments: string[];
}

/**
 * Resolve department string to Department ID
 * Matches by code first (case-insensitive), then by name
 */
async function resolveDepartmentId(
  departmentString: string
): Promise<string | null> {
  const trimmed = departmentString.trim();

  if (!trimmed) {
    return null;
  }

  try {
    // Try to match by code (case-insensitive)
    const byCode = await prisma.department.findFirst({
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
    const byName = await prisma.department.findFirst({
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

    return null;
  } catch (error) {
    console.error(`Error resolving department "${trimmed}":`, error);
    return null;
  }
}

/**
 * Migrate user departments from string field to junction table
 */
async function migrateUserDepartments(dryRun = false): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalUsers: 0,
    usersWithDepartment: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    unresolvedDepartments: [],
  };

  console.log(
    dryRun
      ? "\n🔍 DRY RUN MODE - No changes will be made\n"
      : "\n✅ LIVE MODE - Migrating data\n"
  );

  try {
    // Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        department: true,
      },
    });

    stats.totalUsers = allUsers.length;
    console.log(`📊 Total users: ${stats.totalUsers}`);

    // Filter users with non-null department
    const usersWithDepartment = allUsers.filter(
      (user) => user.department && user.department.trim() !== ""
    );
    stats.usersWithDepartment = usersWithDepartment.length;
    console.log(`👥 Users with department: ${stats.usersWithDepartment}\n`);

    if (stats.usersWithDepartment === 0) {
      console.log("✅ No users to migrate.");
      return stats;
    }

    // Migrate each user
    for (const user of usersWithDepartment) {
      const departmentId = await resolveDepartmentId(user.department!);

      if (departmentId) {
        if (!dryRun) {
          try {
            // Upsert to handle potential duplicates
            await prisma.userDepartment.upsert({
              where: {
                userId_departmentId: {
                  userId: user.id,
                  departmentId: departmentId,
                },
              },
              create: {
                userId: user.id,
                departmentId: departmentId,
              },
              update: {
                // Update assignedAt if needed, or leave empty
              },
            });

            stats.successfulMigrations++;
            console.log(
              `✅ Migrated: ${user.username} (${user.fullName}) → ${user.department}`
            );
          } catch (error) {
            stats.failedMigrations++;
            console.error(`❌ Failed to migrate user ${user.username}:`, error);
          }
        } else {
          stats.successfulMigrations++;
          console.log(
            `✅ [DRY RUN] Would migrate: ${user.username} (${user.fullName}) → ${user.department}`
          );
        }
      } else {
        stats.failedMigrations++;
        stats.unresolvedDepartments.push(user.department!);
        console.warn(
          `⚠️  Could not resolve department "${user.department}" for user ${user.username} (${user.fullName})`
        );
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📈 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total users:              ${stats.totalUsers}`);
    console.log(`Users with department:    ${stats.usersWithDepartment}`);
    console.log(`Successful migrations:    ${stats.successfulMigrations}`);
    console.log(`Failed migrations:        ${stats.failedMigrations}`);

    if (stats.unresolvedDepartments.length > 0) {
      console.log("\n⚠️  Unresolved departments:");
      const uniqueUnresolved = Array.from(new Set(stats.unresolvedDepartments));
      uniqueUnresolved.forEach((dept) => console.log(`   - ${dept}`));
    }

    console.log("=".repeat(60) + "\n");

    return stats;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

/**
 * Rollback migration - remove all UserDepartment records
 */
async function rollbackMigration(): Promise<number> {
  console.log("\n🔄 ROLLBACK MODE - Removing all UserDepartment records\n");

  try {
    const result = await prisma.userDepartment.deleteMany({});
    console.log(`✅ Deleted ${result.count} UserDepartment records`);
    return result.count;
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  }
}

/**
 * Verify migration results
 */
async function verifyMigration(): Promise<void> {
  console.log("\n🔍 VERIFYING MIGRATION\n");

  const usersWithDepartmentString = await prisma.user.count({
    where: {
      department: { not: null },
    },
  });

  const userDepartmentCount = await prisma.userDepartment.count();

  const usersWithRelations = await prisma.user.count({
    where: {
      departments: {
        some: {},
      },
    },
  });

  console.log("Verification Results:");
  console.log(
    `  Users with department string:    ${usersWithDepartmentString}`
  );
  console.log(`  UserDepartment records:           ${userDepartmentCount}`);
  console.log(`  Users with department relations:  ${usersWithRelations}`);

  if (usersWithDepartmentString > 0 && userDepartmentCount === 0) {
    console.warn(
      "\n⚠️  WARNING: Users have department strings but no relations!"
    );
  } else {
    console.log("\n✅ Migration verification passed");
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  try {
    switch (command) {
      case "dry-run":
        await migrateUserDepartments(true);
        break;

      case "migrate":
        await migrateUserDepartments(false);
        break;

      case "rollback":
        await rollbackMigration();
        break;

      case "verify":
        await verifyMigration();
        break;

      case "help":
      default:
        console.log("\n📖 User Department Migration Tool\n");
        console.log("Usage: npm run migrate:user-departments <command>");
        console.log("\nCommands:");
        console.log("  dry-run   - Simulate migration without making changes");
        console.log("  migrate   - Execute migration");
        console.log("  rollback  - Remove all UserDepartment records");
        console.log("  verify    - Verify migration results");
        console.log("  help      - Show this help message\n");
        break;
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
