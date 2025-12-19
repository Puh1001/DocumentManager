import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create permissions
  const permissions = [
    { name: 'view', description: 'View document content' },
    { name: 'download', description: 'Download document file' },
    { name: 'print', description: 'Print document' },
    { name: 'edit', description: 'Edit document (open in local app)' },
    { name: 'create', description: 'Create new documents' },
    { name: 'delete', description: 'Delete documents' },
    { name: 'manage', description: 'Manage permissions' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log('✅ Permissions created');

  // Create roles
  const roles = [
    { name: 'admin', description: 'System administrator with full access' },
    { name: 'manager', description: 'Department manager with CRUD on assigned folders' },
    { name: 'editor', description: 'Can create and edit documents' },
    { name: 'viewer', description: 'View only access' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('✅ Roles created');

  // Assign permissions to roles
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  const managerRole = await prisma.role.findUnique({ where: { name: 'manager' } });
  const editorRole = await prisma.role.findUnique({ where: { name: 'editor' } });
  const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } });

  const allPermissions = await prisma.permission.findMany();
  const viewPerm = allPermissions.find(p => p.name === 'view');
  const downloadPerm = allPermissions.find(p => p.name === 'download');
  const printPerm = allPermissions.find(p => p.name === 'print');
  const editPerm = allPermissions.find(p => p.name === 'edit');
  const createPerm = allPermissions.find(p => p.name === 'create');

  // Admin gets all permissions
  if (adminRole) {
    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }
  }

  // Manager gets view, download, print, edit, create
  if (managerRole && viewPerm && downloadPerm && printPerm && editPerm && createPerm) {
    const managerPerms = [viewPerm, downloadPerm, printPerm, editPerm, createPerm];
    for (const perm of managerPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
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
        where: { roleId_permissionId: { roleId: editorRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: editorRole.id, permissionId: perm.id },
      });
    }
  }

  // Viewer gets only view
  if (viewerRole && viewPerm) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: viewerRole.id, permissionId: viewPerm.id } },
      update: {},
      create: { roleId: viewerRole.id, permissionId: viewPerm.id },
    });
  }
  console.log('✅ Role permissions assigned');

  // Create admin user
  const adminPassword = await argon2.hash('admin123');
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@company.com',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      department: 'IT',
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
  console.log('✅ Admin user created (username: admin, password: admin123)');

  // Create sample departments/folders
  const departments = [
    { name: 'HR', physicalLocation: 'Tủ A, Kệ 1' },
    { name: 'IT', physicalLocation: 'Tủ A, Kệ 2' },
    { name: 'Thu mua', physicalLocation: 'Tủ B, Kệ 1' },
    { name: 'Kinh doanh', physicalLocation: 'Tủ B, Kệ 2' },
    { name: 'Sản xuất', physicalLocation: 'Tủ C, Kệ 1' },
    { name: 'Chất lượng', physicalLocation: 'Tủ C, Kệ 2' },
  ];

  for (const dept of departments) {
    const folder = await prisma.folder.upsert({
      where: { path: dept.name },
      update: {},
      create: {
        name: dept.name,
        path: dept.name,
        physicalLocation: dept.physicalLocation,
      },
    });

    // Create subfolders
    const subfolders = ['Tài liệu ISO', 'KPI', 'Bảo trì thiết bị', 'Cải tiến'];
    for (const sub of subfolders) {
      await prisma.folder.upsert({
        where: { path: `${dept.name}/${sub}` },
        update: {},
        create: {
          name: sub,
          path: `${dept.name}/${sub}`,
          parentId: folder.id,
        },
      });
    }
  }
  console.log('✅ Sample folders created');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

