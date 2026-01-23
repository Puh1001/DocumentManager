import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to create DCC (Document Control Center) role and assign permissions
 * DCC role can approve/reject expired deletion requests and delete any document
 * Run: npx ts-node apps/api/prisma/seeds/create-dcc-role.ts
 */
async function main() {
  console.log('🌱 Creating DCC role and permissions...');

  // 1. Create/Update Document module
  const documentModule = await prisma.module.upsert({
    where: { name: 'Document' },
    update: {},
    create: {
      name: 'Document',
      displayName: 'Document Management',
      description: 'Document management module',
      isActive: true,
    },
  });
  console.log('✅ Document module ready');

  // 2. Create/Update DeletionRequest module
  const deletionRequestModule = await prisma.module.upsert({
    where: { name: 'DeletionRequest' },
    update: {},
    create: {
      name: 'DeletionRequest',
      displayName: 'Deletion Request Management',
      description: 'Manage document deletion requests',
      isActive: true,
    },
  });
  console.log('✅ DeletionRequest module ready');

  // 3. Create DCC role
  let dccRole = await prisma.role.findUnique({
    where: { name: 'dcc' },
  });

  if (!dccRole) {
    dccRole = await prisma.role.create({
      data: {
        name: 'dcc',
        description:
          'Document Control Center - Approves expired deletion requests and manages documents',
      },
    });
    console.log('✅ Role "dcc" created');
  } else {
    console.log('✅ Role "dcc" already exists');
  }

  // 4. Define required permissions
  const permissionsToCreate = [
    {
      name: 'delete:Document',
      description: 'Delete any document regardless of time restriction',
    },
    {
      name: 'view:DeletionRequest',
      description: 'View all deletion requests',
    },
    {
      name: 'manage:DeletionRequest',
      description: 'Approve or reject deletion requests',
    },
  ];

  // 5. Create permissions and link to DCC role
  let createdPerms = 0;
  let existingPerms = 0;
  let linkedPerms = 0;

  for (const permData of permissionsToCreate) {
    // Create or get permission
    let permission = await prisma.permission.findUnique({
      where: { name: permData.name },
    });

    if (!permission) {
      permission = await prisma.permission.create({
        data: permData,
      });
      createdPerms++;
      console.log(`   ✓ Created permission: ${permData.name}`);
    } else {
      existingPerms++;
      console.log(`   ✓ Permission exists: ${permData.name}`);
    }

    // Link permission to DCC role
    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: dccRole.id,
          permissionId: permission.id,
        },
      },
    });

    if (!rolePermission) {
      await prisma.rolePermission.create({
        data: {
          roleId: dccRole.id,
          permissionId: permission.id,
        },
      });
      linkedPerms++;
      console.log(`   ✓ Linked: ${permData.name} → dcc role`);
    } else {
      console.log(`   ✓ Already linked: ${permData.name} → dcc role`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Permissions created: ${createdPerms}`);
  console.log(`   Permissions existing: ${existingPerms}`);
  console.log(`   Permissions linked: ${linkedPerms}`);
  console.log('\n✅ DCC role setup complete!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
