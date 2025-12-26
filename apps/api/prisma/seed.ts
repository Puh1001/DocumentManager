import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create permissions
  const permissions = [
    { name: "view", description: "View document content" },
    { name: "download", description: "Download document file" },
    { name: "print", description: "Print document" },
    { name: "edit", description: "Edit document (open in local app)" },
    { name: "create", description: "Create new documents" },
    { name: "delete", description: "Delete documents" },
    { name: "manage", description: "Manage permissions" },
    // Page-level permissions
    { name: "view:User", description: "View user management page" },
    { name: "view:Department", description: "View department management page" },
    { name: "view:Kpi", description: "View KPI tracking page" },
    { name: "view:Maintenance", description: "View maintenance notices page" },
    { name: "view:Permission", description: "View permission management page" },
  ];

  let createdPerms = 0;
  let existingPerms = 0;
  for (const perm of permissions) {
    const existing = await prisma.permission.findUnique({
      where: { name: perm.name },
    });
    if (existing) {
      existingPerms++;
    } else {
      createdPerms++;
    }
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log(
    `✅ Permissions: ${createdPerms} created, ${existingPerms} already exist (not modified)`
  );

  // Create roles
  const roles = [
    { name: "admin", description: "System administrator with full access" },
    {
      name: "manager",
      description: "Department manager with CRUD on assigned folders",
    },
    { name: "editor", description: "Can create and edit documents" },
    { name: "viewer", description: "View only access" },
    {
      name: "boss",
      description: "Boss role with view access to all departments",
    },
  ];

  let createdRoles = 0;
  let existingRoles = 0;
  for (const role of roles) {
    const existing = await prisma.role.findUnique({
      where: { name: role.name },
    });
    if (existing) {
      existingRoles++;
    } else {
      createdRoles++;
    }
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log(
    `✅ Roles: ${createdRoles} created, ${existingRoles} already exist (not modified)`
  );

  // Assign permissions to roles
  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  const managerRole = await prisma.role.findUnique({
    where: { name: "manager" },
  });
  const editorRole = await prisma.role.findUnique({
    where: { name: "editor" },
  });
  const viewerRole = await prisma.role.findUnique({
    where: { name: "viewer" },
  });
  const bossRole = await prisma.role.findUnique({
    where: { name: "boss" },
  });

  const allPermissions = await prisma.permission.findMany();
  const viewPerm = allPermissions.find((p) => p.name === "view");
  const downloadPerm = allPermissions.find((p) => p.name === "download");
  const printPerm = allPermissions.find((p) => p.name === "print");
  const editPerm = allPermissions.find((p) => p.name === "edit");
  const createPerm = allPermissions.find((p) => p.name === "create");

  // Admin gets all permissions
  if (adminRole) {
    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }
  }

  // Manager gets view, download, print, edit, create
  if (
    managerRole &&
    viewPerm &&
    downloadPerm &&
    printPerm &&
    editPerm &&
    createPerm
  ) {
    const managerPerms = [
      viewPerm,
      downloadPerm,
      printPerm,
      editPerm,
      createPerm,
    ];
    for (const perm of managerPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: managerRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: { roleId: managerRole.id, permissionId: perm.id },
      });
    }
  }

  // Editor gets view, download, edit, create
  if (editorRole && viewPerm && downloadPerm && editPerm && createPerm) {
    const editorPerms = [viewPerm, downloadPerm, editPerm, createPerm];
    for (const perm of editorPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: editorRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: editorRole.id, permissionId: perm.id },
      });
    }
  }

  // Viewer gets only view
  if (viewerRole && viewPerm) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: viewerRole.id,
          permissionId: viewPerm.id,
        },
      },
      update: {},
      create: { roleId: viewerRole.id, permissionId: viewPerm.id },
    });
  }

  // Boss gets view, download, print (read-only access to all)
  if (bossRole && viewPerm && downloadPerm && printPerm) {
    const bossPerms = [viewPerm, downloadPerm, printPerm];
    for (const perm of bossPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: bossRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: { roleId: bossRole.id, permissionId: perm.id },
      });
    }
  }
  console.log(
    "✅ Role permissions assigned (existing permissions not modified)"
  );

  // Create admin user
  const existingAdmin = await prisma.user.findUnique({
    where: { username: "admin" },
  });
  const adminPassword = await argon2.hash("admin123");
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@company.com",
      passwordHash: adminPassword,
      fullName: "System Administrator",
      department: "IT",
      isActive: true,
    },
  });

  // Assign admin role
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    });
  }
  if (existingAdmin) {
    console.log(
      "✅ Admin user already exists (username: admin) - password NOT changed"
    );
  } else {
    console.log("✅ Admin user created (username: admin, password: admin123)");
  }

  // Create boss user
  const existingBoss = await prisma.user.findUnique({
    where: { username: "boss" },
  });
  const bossPassword = await argon2.hash("boss123");
  const boss = await prisma.user.upsert({
    where: { username: "boss" },
    update: {},
    create: {
      username: "boss",
      email: "boss@company.com",
      passwordHash: bossPassword,
      fullName: "Boss User",
      department: "Management",
      isActive: true,
    },
  });

  // Assign boss role
  if (bossRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: boss.id, roleId: bossRole.id } },
      update: {},
      create: { userId: boss.id, roleId: bossRole.id },
    });
  }
  if (existingBoss) {
    console.log(
      "✅ Boss user already exists (username: boss) - password NOT changed"
    );
  } else {
    console.log("✅ Boss user created (username: boss, password: boss123)");
  }

  // Create sample departments/folders
  // Match with actual folders: HR, IT, PR, SD, QC, PD
  const departments = [
    { name: "HR", code: "HR", physicalLocation: "Tủ A, Kệ 1" },
    { name: "IT", code: "IT", physicalLocation: "Tủ A, Kệ 2" },
    { name: "PR", code: "PR", physicalLocation: "Tủ B, Kệ 1" }, // Purchasing/Production
    { name: "SD", code: "SD", physicalLocation: "Tủ B, Kệ 2" }, // Sales/Service Department
    { name: "QC", code: "QC", physicalLocation: "Tủ C, Kệ 1" }, // Quality Control
    { name: "PD", code: "PD", physicalLocation: "Tủ C, Kệ 2" }, // Production/Product Development
  ];

  // Create or get departments
  let createdDepts = 0;
  let existingDepts = 0;
  const departmentMap = new Map<string, { id: string; name: string }>();

  for (const dept of departments) {
    const existing = await prisma.department.findUnique({
      where: { code: dept.code },
    });
    if (existing) {
      existingDepts++;
      departmentMap.set(dept.name, { id: existing.id, name: existing.name });
    } else {
      createdDepts++;
      const department = await prisma.department.upsert({
        where: { code: dept.code },
        update: {},
        create: {
          name: dept.name,
          code: dept.code,
          isActive: true,
        },
      });
      departmentMap.set(dept.name, {
        id: department.id,
        name: department.name,
      });
    }
  }
  console.log(
    `✅ Departments: ${createdDepts} created, ${existingDepts} already exist (not modified)`
  );

  // Create folders linked to departments
  let createdFolders = 0;
  let existingFolders = 0;
  for (const dept of departments) {
    const department = departmentMap.get(dept.name);
    if (!department) continue;

    const existing = await prisma.folder.findUnique({
      where: { path: dept.name },
    });
    if (existing) {
      existingFolders++;
      // Update existing folder with departmentId if not set
      if (!existing.departmentId) {
        await prisma.folder.update({
          where: { id: existing.id },
          data: { departmentId: department.id },
        });
      }
    } else {
      createdFolders++;
    }
    const folder = await prisma.folder.upsert({
      where: { path: dept.name },
      update: {
        departmentId: department.id, // Update departmentId if folder exists
      },
      create: {
        name: dept.name,
        path: dept.name,
        physicalLocation: dept.physicalLocation,
        departmentId: department.id, // Link to department
      },
    });

    // Create subfolders (inherit departmentId from parent)
    const subfolders = ["Tài liệu ISO", "KPI", "Bảo trì thiết bị", "Cải tiến"];
    for (const sub of subfolders) {
      await prisma.folder.upsert({
        where: { path: `${dept.name}/${sub}` },
        update: {
          departmentId: department.id, // Update departmentId if subfolder exists
        },
        create: {
          name: sub,
          path: `${dept.name}/${sub}`,
          parentId: folder.id,
          departmentId: department.id, // Inherit from parent
        },
      });
    }
  }
  console.log(
    `✅ Folders: ${createdFolders} created, ${existingFolders} already exist (not modified)`
  );

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
