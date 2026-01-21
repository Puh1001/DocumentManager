import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script to create kpi_viewer_all role and assign permissions
 * Run: npx ts-node apps/api/prisma/seeds/create-kpi-viewer-all-role.ts
 */
async function main() {
  console.log("🌱 Creating kpi_viewer_all role...");

  // 1. Create role if not exists
  let kpiViewerAllRole = await prisma.role.findUnique({
    where: { name: "kpi_viewer_all" },
  });

  if (!kpiViewerAllRole) {
    kpiViewerAllRole = await prisma.role.create({
      data: {
        name: "kpi_viewer_all",
        description:
          "Can view all KPI records from all departments (read-only)",
      },
    });
    console.log("✅ Role 'kpi_viewer_all' created");
  } else {
    console.log("✅ Role 'kpi_viewer_all' already exists");
  }

  // 2. Get or create KPI permissions
  const kpiViewPerm = await prisma.permission.findUnique({
    where: { name: "view:Kpi" },
  });
  const kpiDownloadPerm = await prisma.permission.findUnique({
    where: { name: "download:Kpi" },
  });
  const kpiPrintPerm = await prisma.permission.findUnique({
    where: { name: "print:Kpi" },
  });

  // If permissions don't exist, they need to be created first
  // This usually happens when seed script is run
  if (!kpiViewPerm || !kpiDownloadPerm || !kpiPrintPerm) {
    console.log(
      "⚠️  KPI permissions not found. Please run full seed script first:"
    );
    console.log("   cd apps/api && npx prisma db seed");
    process.exit(1);
  }

  // 3. Assign permissions to role
  let assignedCount = 0;
  let existingCount = 0;

  const permissions = [
    { perm: kpiViewPerm, name: "view:Kpi" },
    { perm: kpiDownloadPerm, name: "download:Kpi" },
    { perm: kpiPrintPerm, name: "print:Kpi" },
  ];

  for (const { perm, name } of permissions) {
    if (!perm) continue;

    const existing = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: kpiViewerAllRole.id,
          permissionId: perm.id,
        },
      },
    });

    if (existing) {
      existingCount++;
    } else {
      await prisma.rolePermission.create({
        data: {
          roleId: kpiViewerAllRole.id,
          permissionId: perm.id,
        },
      });
      assignedCount++;
      console.log(`✅ Permission '${name}' assigned to role`);
    }
  }

  if (assignedCount > 0) {
    console.log(
      `\n✅ ${assignedCount} permissions assigned, ${existingCount} already existed`
    );
  } else if (existingCount > 0) {
    console.log(
      `\n✅ All permissions already assigned (${existingCount} total)`
    );
  }

  console.log("\n🎉 kpi_viewer_all role setup completed!");
}

main()
  .catch((e) => {
    console.error("❌ Failed to create kpi_viewer_all role:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
