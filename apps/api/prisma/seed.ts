import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create modules
  const modules = [
    {
      name: "User",
      displayName: "User Management",
      description: "User management module",
    },
    {
      name: "Department",
      displayName: "Department Management",
      description: "Department management module",
    },
    {
      name: "Kpi",
      displayName: "KPI Tracking",
      description: "KPI tracking module",
    },
    {
      name: "Maintenance",
      displayName: "Maintenance Notices",
      description: "Maintenance notices module",
    },
    {
      name: "Permission",
      displayName: "Permission Management",
      description: "Permission management module",
    },
  ];

  let createdModules = 0;
  let existingModules = 0;
  for (const module of modules) {
    const existing = await prisma.module.findUnique({
      where: { name: module.name },
    });
    if (existing) {
      existingModules++;
    } else {
      createdModules++;
    }
    await prisma.module.upsert({
      where: { name: module.name },
      update: {},
      create: module,
    });
  }
  console.log(
    `✅ Modules: ${createdModules} created, ${existingModules} already exist (not modified)`
  );

  /**
   * Auto-generate module permissions
   *
   * Generates all standard permissions (view, create, edit, delete, manage) for each module.
   * Uses same STANDARD_ACTIONS as ModuleService for consistency.
   * Fetches all active modules from database (not just newly created ones) to ensure
   * permissions are generated for existing modules as well.
   *
   * @remarks
   * - Uses upsert for idempotency (safe to run multiple times)
   * - Tracks created vs existing permissions for logging
   * - Continues with next permission if one fails (error handling)
   */
  const STANDARD_ACTIONS = ["view", "create", "edit", "delete", "manage"];

  let createdModulePerms = 0;
  let existingModulePerms = 0;
  let failedModulePerms = 0;

  // Get all modules (including newly created ones)
  // This ensures permissions are generated for existing modules too
  const allModules = await prisma.module.findMany({
    where: { isActive: true },
  });

  // Auto-generate permissions for each module
  for (const module of allModules) {
    for (const action of STANDARD_ACTIONS) {
      try {
        const permissionName = `${action}:${module.name}`;
        const existing = await prisma.permission.findUnique({
          where: { name: permissionName },
        });
        if (existing) {
          existingModulePerms++;
        } else {
          createdModulePerms++;
        }
        await prisma.permission.upsert({
          where: { name: permissionName },
          update: {},
          create: {
            name: permissionName,
            description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.name} module`,
          },
        });
      } catch (error) {
        failedModulePerms++;
        console.error(
          `❌ Failed to create permission ${action}:${module.name}:`,
          error instanceof Error ? error.message : error
        );
        // Continue with next permission
      }
    }
  }

  if (failedModulePerms > 0) {
    console.log(
      `⚠️  Module permissions: ${createdModulePerms} created, ${existingModulePerms} already exist, ${failedModulePerms} failed`
    );
  } else {
    console.log(
      `✅ Module permissions: ${createdModulePerms} created, ${existingModulePerms} already exist (not modified)`
    );
  }

  // Create document-level permissions (not module-specific)
  const documentPermissions = [
    { name: "view", description: "View document content" },
    { name: "download", description: "Download document file" },
    { name: "print", description: "Print document" },
    { name: "edit", description: "Edit document (open in local app)" },
    { name: "create", description: "Create new documents" },
    { name: "delete", description: "Delete documents" },
    { name: "manage", description: "Manage permissions" },
  ];

  let createdDocPerms = 0;
  let existingDocPerms = 0;
  for (const perm of documentPermissions) {
    const existing = await prisma.permission.findUnique({
      where: { name: perm.name },
    });
    if (existing) {
      existingDocPerms++;
    } else {
      createdDocPerms++;
    }
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log(
    `✅ Document permissions: ${createdDocPerms} created, ${existingDocPerms} already exist (not modified)`
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
    {
      name: "kpi_viewer_all",
      description: "Can view all KPI records from all departments (read-only)",
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
  const kpiViewerAllRole = await prisma.role.findUnique({
    where: { name: "kpi_viewer_all" },
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

  // kpi_viewer_all gets view, download, print for KPI module only (read-only access to all KPI)
  if (kpiViewerAllRole) {
    const kpiViewPerm = allPermissions.find((p) => p.name === "view:Kpi");
    const kpiDownloadPerm = allPermissions.find((p) => p.name === "download:Kpi");
    const kpiPrintPerm = allPermissions.find((p) => p.name === "print:Kpi");
    
    if (kpiViewPerm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: kpiViewerAllRole.id,
            permissionId: kpiViewPerm.id,
          },
        },
        update: {},
        create: { roleId: kpiViewerAllRole.id, permissionId: kpiViewPerm.id },
      });
    }
    if (kpiDownloadPerm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: kpiViewerAllRole.id,
            permissionId: kpiDownloadPerm.id,
          },
        },
        update: {},
        create: { roleId: kpiViewerAllRole.id, permissionId: kpiDownloadPerm.id },
      });
    }
    if (kpiPrintPerm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: kpiViewerAllRole.id,
            permissionId: kpiPrintPerm.id,
          },
        },
        update: {},
        create: { roleId: kpiViewerAllRole.id, permissionId: kpiPrintPerm.id },
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

  // Create all departments with multilingual support (EN, VI, ZH)
  const departments = [
    {
      code: "BOD",
      nameVi: "BOD",
      nameEn: "General Manager's Office",
      nameZh: "总经办BOD",
      physicalLocation: "Tủ A, Kệ 1",
    },
    {
      code: "HCNS",
      nameVi: "HCNS",
      nameEn: "Human Resources Department",
      nameZh: "人力资源部HCNS",
      physicalLocation: "Tủ A, Kệ 2",
    },
    {
      code: "KINH_DOANH",
      nameVi: "Kinh doanh",
      nameEn: "Business Department",
      nameZh: "营业部Kinh doanh",
      physicalLocation: "Tủ B, Kệ 1",
    },
    {
      code: "KE_TOAN",
      nameVi: "Kế toán",
      nameEn: "Finance Department",
      nameZh: "财务部Kế toán",
      physicalLocation: "Tủ B, Kệ 2",
    },
    {
      code: "THU_MUA",
      nameVi: "Thu mua",
      nameEn: "Purchasing Department",
      nameZh: "采购部Thu mua",
      physicalLocation: "Tủ C, Kệ 1",
    },
    {
      code: "IT",
      nameVi: "Phòng thông tin",
      nameEn: "Information Technology Department",
      nameZh: "资讯科技部IT",
      physicalLocation: "Tủ C, Kệ 2",
    },
    {
      code: "XNK",
      nameVi: "Xuất nhập khẩu",
      nameEn: "Shipping Department",
      nameZh: "船务部 XNK",
      physicalLocation: "Tủ D, Kệ 1",
    },
    {
      code: "PTVL",
      nameVi: "Phát triển vật liệu",
      nameEn: "Material Development Department",
      nameZh: "材料开发部Phát triển vật liệu",
      physicalLocation: "Tủ D, Kệ 2",
    },
    {
      code: "PHONG_MAU",
      nameVi: "Phòng mẫu",
      nameEn: "Sample Room",
      nameZh: "板房Phòng mẫu",
      physicalLocation: "Tủ E, Kệ 1",
    },
    {
      code: "SAN_XUAT",
      nameVi: "Sản xuất",
      nameEn: "Production Department",
      nameZh: "生产部Sản xuất",
      physicalLocation: "Tủ E, Kệ 2",
    },
    {
      code: "LTB",
      nameVi: "LTB",
      nameEn: "LTB",
      nameZh: "LTB",
      physicalLocation: "Tủ F, Kệ 1",
    },
    {
      code: "LTB_DAI",
      nameVi: "LTB đai",
      nameEn: "LTB Webbing",
      nameZh: "织带LTBLTB đai",
      physicalLocation: "Tủ F, Kệ 2",
    },
    {
      code: "PHONG_KIEM_NGHIEM",
      nameVi: "Phòng kiểm nghiệm",
      nameEn: "Testing Room",
      nameZh: "测试室Phòng kiểm nghiệm",
      physicalLocation: "Tủ G, Kệ 1",
    },
    {
      code: "NC_PT_VAI",
      nameVi: "Nghiên cứu phát triển vải",
      nameEn: "Fabric R&D Department",
      nameZh: "面料研发部Nghiên cứu phát triển vải",
      physicalLocation: "Tủ G, Kệ 2",
    },
    {
      code: "PMC",
      nameVi: "PMC",
      nameEn: "Planning Department",
      nameZh: "计划部PMC",
      physicalLocation: "Tủ H, Kệ 1",
    },
    {
      code: "QA",
      nameVi: "QA",
      nameEn: "QA",
      nameZh: "QA",
      physicalLocation: "Tủ H, Kệ 2",
    },
    {
      code: "KHO",
      nameVi: "Kho",
      nameEn: "Warehouse",
      nameZh: "仓库Kho",
      physicalLocation: "Tủ I, Kệ 1",
    },
    {
      code: "CONG_TRINH",
      nameVi: "Công trình",
      nameEn: "Engineering Department",
      nameZh: "工程部Công trình",
      physicalLocation: "Tủ I, Kệ 2",
    },
    {
      code: "CONG_TRINH_DU_AN",
      nameVi: "Công trình dự án",
      nameEn: "Industrial Engineering Department",
      nameZh: "工业工程部Công trình Dự án",
      physicalLocation: "Tủ J, Kệ 1",
    },
    {
      code: "BOC_SOI",
      nameVi: "Bọc sợi",
      nameEn: "Yarn Covering Department",
      nameZh: "包根部Bọc sợi",
      physicalLocation: "Tủ J, Kệ 2",
    },
    {
      code: "KEO_SOI",
      nameVi: "Kéo sợi",
      nameEn: "Warping Department",
      nameZh: "经纱部Kéo sợi",
      physicalLocation: "Tủ K, Kệ 1",
    },
    {
      code: "CONG_NGHE",
      nameVi: "Công nghệ",
      nameEn: "Transfer Machine Technology Department",
      nameZh: "转机工艺部Công nghệ",
      physicalLocation: "Tủ K, Kệ 2",
    },
    {
      code: "DET_DAI",
      nameVi: "Dệt đai",
      nameEn: "Weaving Machine Department",
      nameZh: "织机部Dệt đai",
      physicalLocation: "Tủ L, Kệ 1",
    },
    {
      code: "NHUOM_DAI",
      nameVi: "Nhuộm đai",
      nameEn: "Bleaching and Dyeing Department",
      nameZh: "漂染部Nhuộm đai",
      physicalLocation: "Tủ L, Kệ 2",
    },
    {
      code: "QC_DAI",
      nameVi: "QC đai",
      nameEn: "Webbing QC Department",
      nameZh: "织带QC部QC đai",
      physicalLocation: "Tủ M, Kệ 1",
    },
    {
      code: "DET_DOC",
      nameVi: "Dệt dọc",
      nameEn: "Warping and Weaving Department",
      nameZh: "整经织造部Dệt dọc",
      physicalLocation: "Tủ M, Kệ 2",
    },
    {
      code: "DET_NGANG",
      nameVi: "Dệt ngang",
      nameEn: "Weft Knitting Department",
      nameZh: "纬编部Dệt ngang",
      physicalLocation: "Tủ N, Kệ 1",
    },
    {
      code: "DET_NGANG_S",
      nameVi: "Dệt ngang - S",
      nameEn: "Weft Knitting Department - S",
      nameZh: "纬编部 - S Dệt ngang - S",
      physicalLocation: "Tủ N, Kệ 2",
    },
    {
      code: "PHONG_THI_NGHIEM",
      nameVi: "Phòng thí nghiệm",
      nameEn: "Laboratory",
      nameZh: "实验室Thí nghiệm",
      physicalLocation: "Tủ O, Kệ 1",
    },
    {
      code: "NHUOM_VAI",
      nameVi: "Nhuộm vải",
      nameEn: "Dyeing Department",
      nameZh: "染色部Nhuộm vải",
      physicalLocation: "Tủ O, Kệ 2",
    },
    {
      code: "DINH_HINH",
      nameVi: "Định hình",
      nameEn: "Setting Department",
      nameZh: "定型部Định hình",
      physicalLocation: "Tủ P, Kệ 1",
    },
    {
      code: "QC_VAI",
      nameVi: "QC vải",
      nameEn: "Fabric QC Department",
      nameZh: "面料QC部QC vải",
      physicalLocation: "Tủ P, Kệ 2",
    },
    {
      code: "IN_HOA",
      nameVi: "In hoa",
      nameEn: "Printing Department",
      nameZh: "印花部In hoa",
      physicalLocation: "Tủ Q, Kệ 1",
    },
    {
      code: "GIAI_DOAN_TRUOC_NHUOM_SOI",
      nameVi: "Giai đoạn trước nhuộm sợi",
      nameEn: "Pre-dyeing Yarn Section Department",
      nameZh: "染纱前段部Giai đoạn trước nhuộm sợi",
      physicalLocation: "Tủ Q, Kệ 2",
    },
    {
      code: "GIAI_DOAN_SAU_NHUOM_SOI",
      nameVi: "Giai đoạn sau nhuộm sợi",
      nameEn: "Post-dyeing Yarn Section Department",
      nameZh: "染纱后段部Giai đoạn sau nhuộm sợi",
      physicalLocation: "Tủ R, Kệ 1",
    },
    {
      code: "CN_HUNG_YEN_DET_NGANG",
      nameVi: "Chi nhánh Hưng Yên - Dệt ngang",
      nameEn: "Weft Knitting Department - Hung Yen Branch",
      nameZh: "纬编部 - 兴安Chi nhánh Hưng Yên- Dệt ngang",
      physicalLocation: "Tủ R, Kệ 2",
    },
    {
      code: "CN_NGHE_AN_2_DET_NGANG",
      nameVi: "Chi nhánh Nghệ An 2 - Dệt ngang",
      nameEn: "Weft Knitting Department - Nghe An 2 Branch",
      nameZh: "纬编部 - 义安 2Chi nhánh Dệt ngang - Nghệ An 2",
      physicalLocation: "Tủ S, Kệ 1",
    },
    {
      code: "CN_HUNG_YEN_DET_DAI",
      nameVi: "Chi nhánh Hưng Yên - Dệt đai",
      nameEn: "Weaving Machine Department - Hung Yen Branch",
      nameZh: "织机部- 兴安Chi nhánh Hưng Yên - Dệt đai",
      physicalLocation: "Tủ S, Kệ 2",
    },
    {
      code: "MG",
      nameVi: "MG",
      nameEn: "MG",
      nameZh: "MG",
      physicalLocation: "Tủ T, Kệ 1",
    },
  ];

  // Create or get departments
  let createdDepts = 0;
  let existingDepts = 0;
  let updatedDepts = 0;
  const departmentMap = new Map<string, { id: string; name: string }>();

  for (const dept of departments) {
    const existing = await prisma.department.findUnique({
      where: { code: dept.code },
    });
    if (existing) {
      existingDepts++;
      // Update multilingual names if they're missing
      // Type assertion needed until Prisma Client is regenerated
      const existingWithMultilingual = existing as typeof existing & {
        nameEn?: string | null;
        nameVi?: string | null;
        nameZh?: string | null;
      };
      const needsUpdate =
        !existingWithMultilingual.nameEn ||
        !existingWithMultilingual.nameVi ||
        !existingWithMultilingual.nameZh ||
        existing.name !== dept.nameVi;
      if (needsUpdate) {
        updatedDepts++;
        await prisma.department.update({
          where: { code: dept.code },
          data: {
            name: dept.nameVi,
            nameEn: dept.nameEn,
            nameVi: dept.nameVi,
            nameZh: dept.nameZh,
          } as any, // Type assertion: fields exist in DB, will be in Prisma Client after regenerate
        });
      }
      departmentMap.set(dept.code, {
        id: existing.id,
        name: dept.nameVi,
      });
    } else {
      createdDepts++;
      const department = await prisma.department.upsert({
        where: { code: dept.code },
        update: {
          name: dept.nameVi,
          nameEn: dept.nameEn,
          nameVi: dept.nameVi,
          nameZh: dept.nameZh,
        } as any, // Type assertion: fields exist in DB, will be in Prisma Client after regenerate
        create: {
          name: dept.nameVi,
          nameEn: dept.nameEn,
          nameVi: dept.nameVi,
          nameZh: dept.nameZh,
          code: dept.code,
          isActive: true,
        } as any, // Type assertion: fields exist in DB, will be in Prisma Client after regenerate
      });
      departmentMap.set(dept.code, {
        id: department.id,
        name: department.name,
      });
    }
  }
  if (updatedDepts > 0) {
    console.log(
      `✅ Departments: ${createdDepts} created, ${existingDepts} already exist, ${updatedDepts} updated with multilingual names`
    );
  } else {
    console.log(
      `✅ Departments: ${createdDepts} created, ${existingDepts} already exist (not modified)`
    );
  }

  // Create folders linked to departments
  let createdFolders = 0;
  let existingFolders = 0;
  for (const dept of departments) {
    const department = departmentMap.get(dept.code);
    if (!department) continue;

    const folderPath = dept.code;
    const existing = await prisma.folder.findUnique({
      where: { path: folderPath },
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
      where: { path: folderPath },
      update: {
        departmentId: department.id, // Update departmentId if folder exists
      },
      create: {
        name: dept.nameVi,
        path: folderPath,
        physicalLocation: dept.physicalLocation,
        departmentId: department.id, // Link to department
      },
    });

    // Create subfolders (inherit departmentId from parent)
    const subfolders = ["Tài liệu ISO", "KPI", "Bảo trì thiết bị", "Cải tiến"];
    for (const sub of subfolders) {
      await prisma.folder.upsert({
        where: { path: `${folderPath}/${sub}` },
        update: {
          departmentId: department.id, // Update departmentId if subfolder exists
        },
        create: {
          name: sub,
          path: `${folderPath}/${sub}`,
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
