import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Migration: Add Module "Client" and permissions (view:Client, create:Client, …).
 * Idempotent – safe to run on existing DB; does not touch other data.
 * Run from apps/api: npx ts-node prisma/migrations/add-client-module-and-permissions.ts
 */
async function main() {
  console.log("🌱 Adding Client module and permissions...");

  // 1. Upsert Module "Client"
  const clientModule = await prisma.module.upsert({
    where: { name: "Client" },
    update: {},
    create: {
      name: "Client",
      displayName: "Client Files",
      description: "Client files upload and management",
      isActive: true,
    },
  });
  console.log("✅ Module 'Client' ready (id:", clientModule.id, ")");

  // 2. Ensure DocumentLevel "CLIENT" exists (required for Client file documents)
  const clientLevel = await prisma.documentLevel.upsert({
    where: { code: "CLIENT" },
    update: {},
    create: {
      code: "CLIENT",
      name: "Client",
      nameEn: "Client",
      nameVi: "Client",
      nameZh: "客户",
      isActive: true,
      sortOrder: 10,
    },
  });
  console.log("✅ Document level 'CLIENT' ready (id:", clientLevel.id, ")");

  // 3. Standard actions for module permissions (same as seed)
  const STANDARD_ACTIONS = ["view", "create", "edit", "delete", "manage"];
  const clientPermissions: { id: string; name: string }[] = [];

  for (const action of STANDARD_ACTIONS) {
    const permissionName = `${action}:Client`;
    const perm = await prisma.permission.upsert({
      where: { name: permissionName },
      update: {},
      create: {
        name: permissionName,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} Client module`,
      },
    });
    clientPermissions.push(perm);
  }
  console.log(
    `✅ Permissions: ${STANDARD_ACTIONS.map((a) => `${a}:Client`).join(", ")}`,
  );

  // 4. Assign Client permissions to admin (all) and dcc (view, create, delete)
  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  const dccRole = await prisma.role.findUnique({ where: { name: "dcc" } });
  const dccActions = ["view", "create", "delete"];

  let adminLinked = 0;
  let dccLinked = 0;

  for (const permission of clientPermissions) {
    if (adminRole) {
      const existing = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        });
        adminLinked++;
      }
    }

    if (dccRole && dccActions.some((a) => permission.name === `${a}:Client`)) {
      const existing = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: dccRole.id,
            permissionId: permission.id,
          },
        },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            roleId: dccRole.id,
            permissionId: permission.id,
          },
        });
        dccLinked++;
      }
    }
  }

  if (adminRole) {
    console.log(`✅ Admin: ${adminLinked} new Client permission(s) assigned`);
  } else {
    console.log("⚠️  Admin role not found – skip role assignment");
  }
  if (dccRole) {
    console.log(`✅ DCC: ${dccLinked} new Client permission(s) assigned`);
  } else {
    console.log("⚠️  DCC role not found – run create-dcc-role seed if needed");
  }

  console.log("\n🎉 Client module migration completed.");
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
