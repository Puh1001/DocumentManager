import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verifying admin_dept users migration...\n");

  // 1. Check admin_dept role exists
  const adminDeptRole = await prisma.role.findUnique({
    where: { name: "admin_dept" },
    include: {
      users: true,
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!adminDeptRole) {
    console.error("❌ admin_dept role not found!");
    return;
  }

  console.log(`✅ Role 'admin_dept' found`);
  console.log(`   Users assigned: ${adminDeptRole.users.length}`);
  console.log(`   Permissions: ${adminDeptRole.permissions.length}`);

  if (adminDeptRole.permissions.length > 0) {
    console.log("   Permission list:");
    adminDeptRole.permissions.forEach((rp) => {
      console.log(`     - ${rp.permission.name}`);
    });
  }
  console.log("");

  // 2. Get all users with admin_dept role
  const users = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          roleId: adminDeptRole.id,
        },
      },
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
    orderBy: {
      username: "asc",
    },
  });

  console.log(`📊 Found ${users.length} users with admin_dept role:\n`);

  // 3. Verify each user
  const departmentCounts: Record<string, number> = {};
  let usersWithoutDepartment = 0;

  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.fullName} (${user.username})`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Department: ${user.department || "NOT SET"}`);
    console.log(`   Active: ${user.isActive ? "Yes" : "No"}`);
    console.log(`   Roles: ${user.roles.map((r) => r.role.name).join(", ")}`);
    console.log("");

    if (user.department) {
      departmentCounts[user.department] =
        (departmentCounts[user.department] || 0) + 1;
    } else {
      usersWithoutDepartment++;
    }
  });

  // 4. Summary by department
  console.log("📈 Users by Department:");
  Object.entries(departmentCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([dept, count]) => {
      console.log(`   ${dept}: ${count} user(s)`);
    });

  if (usersWithoutDepartment > 0) {
    console.log(`   ⚠️  ${usersWithoutDepartment} user(s) without department`);
  }

  console.log("");

  // 5. Check for potential issues
  console.log("🔍 Checking for issues...");

  const duplicateEmails = await prisma.user.groupBy({
    by: ["email"],
    having: {
      email: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  if (duplicateEmails.length > 0) {
    console.log(`⚠️  Found ${duplicateEmails.length} duplicate email(s):`);
    duplicateEmails.forEach((dup) => {
      console.log(`   - ${dup.email}`);
    });
  } else {
    console.log("✅ No duplicate emails");
  }

  const inactiveUsers = users.filter((u) => !u.isActive);
  if (inactiveUsers.length > 0) {
    console.log(`⚠️  Found ${inactiveUsers.length} inactive user(s):`);
    inactiveUsers.forEach((u) => {
      console.log(`   - ${u.username} (${u.fullName})`);
    });
  } else {
    console.log("✅ All users are active");
  }

  console.log("");
  console.log("🎉 Verification completed!");
}

main()
  .catch((e) => {
    console.error("❌ Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
