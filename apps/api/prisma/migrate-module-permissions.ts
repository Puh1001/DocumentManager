import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Migration script to generate missing module permissions
 *
 * This script generates all standard permissions (view, create, edit, delete, manage)
 * for existing modules in the database. It only creates missing permissions,
 * making it safe to run multiple times (idempotent).
 *
 * Use case: Run this script on existing databases that only have "view" permissions
 * for modules and need the other standard permissions (create, edit, delete, manage).
 *
 * @example
 * ```bash
 * cd apps/api
 * npx tsx prisma/migrate-module-permissions.ts
 * ```
 */
async function main() {
  console.log("🔄 Migrating module permissions...");
  console.log(
    "📋 This script will generate missing permissions for all active modules"
  );
  console.log("");

  // Use same STANDARD_ACTIONS as ModuleService and seed file for consistency
  const STANDARD_ACTIONS = ["view", "create", "edit", "delete", "manage"];

  let createdPerms = 0;
  let existingPerms = 0;
  let failedPerms = 0;
  const createdPermissionNames: string[] = [];

  // Load all active modules from database
  const modules = await prisma.module.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  if (modules.length === 0) {
    console.log("⚠️  No active modules found in database");
    console.log(
      "💡 Make sure modules are created before running this migration"
    );
    return;
  }

  console.log(
    `📦 Found ${modules.length} active module(s): ${modules.map((m) => m.name).join(", ")}`
  );
  console.log("");

  // Generate missing permissions for each module
  for (const module of modules) {
    console.log(`  Processing module: ${module.name} (${module.displayName})`);

    for (const action of STANDARD_ACTIONS) {
      try {
        const permissionName = `${action}:${module.name}`;

        // Check if permission already exists
        const existing = await prisma.permission.findUnique({
          where: { name: permissionName },
        });

        if (existing) {
          existingPerms++;
          // Permission already exists, skip
        } else {
          // Create missing permission
          await prisma.permission.create({
            data: {
              name: permissionName,
              description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.name} module`,
            },
          });
          createdPerms++;
          createdPermissionNames.push(permissionName);
          console.log(`    ✅ Created: ${permissionName}`);
        }
      } catch (error) {
        failedPerms++;
        const permissionName = `${action}:${module.name}`;
        console.error(
          `    ❌ Failed to create permission ${permissionName}:`,
          error instanceof Error ? error.message : error
        );
        // Continue with next permission
      }
    }
  }

  console.log("");
  console.log("📊 Migration Summary:");
  console.log(`  ✅ Created: ${createdPerms} permission(s)`);
  console.log(`  ℹ️  Already exist: ${existingPerms} permission(s)`);
  if (failedPerms > 0) {
    console.log(`  ❌ Failed: ${failedPerms} permission(s)`);
  }

  // Verification: Check that all expected permissions exist
  console.log("");
  console.log("🔍 Verifying permissions...");

  let verifiedCount = 0;
  let missingCount = 0;
  const missingPermissions: string[] = [];

  for (const module of modules) {
    for (const action of STANDARD_ACTIONS) {
      const permissionName = `${action}:${module.name}`;
      const exists = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (exists) {
        verifiedCount++;
      } else {
        missingCount++;
        missingPermissions.push(permissionName);
      }
    }
  }

  const expectedCount = modules.length * STANDARD_ACTIONS.length;
  console.log(`  Expected: ${expectedCount} permission(s)`);
  console.log(`  Verified: ${verifiedCount} permission(s)`);

  if (missingCount > 0) {
    console.log(`  ⚠️  Missing: ${missingCount} permission(s)`);
    console.log(`  Missing permissions: ${missingPermissions.join(", ")}`);
  } else {
    console.log("  ✅ All expected permissions are present");
  }

  if (createdPerms > 0) {
    console.log("");
    console.log("📝 Created permissions:");
    createdPermissionNames.forEach((name) => {
      console.log(`  - ${name}`);
    });
  }

  console.log("");
  if (failedPerms === 0 && missingCount === 0) {
    console.log("🎉 Migration completed successfully!");
  } else {
    console.log(
      "⚠️  Migration completed with warnings. Please review the output above."
    );
  }
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
