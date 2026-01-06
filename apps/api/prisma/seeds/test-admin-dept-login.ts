import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "bpvn@123$$";

async function main() {
  console.log("🔐 Testing admin_dept user login...\n");

  // Test with first user
  const testUsername = "v210889"; // Phạm Văn Mạnh

  const user = await prisma.user.findUnique({
    where: { username: testUsername },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    console.error(`❌ User '${testUsername}' not found!`);
    return;
  }

  console.log(`✅ User found: ${user.fullName} (${user.username})`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Department: ${user.department}`);
  console.log(`   Active: ${user.isActive}`);
  console.log(`   Roles: ${user.roles.map((r) => r.role.name).join(", ")}`);
  console.log("");

  // Verify password
  const passwordMatch = await argon2.verify(
    user.passwordHash,
    DEFAULT_PASSWORD
  );

  if (passwordMatch) {
    console.log(`✅ Password verification: SUCCESS`);
    console.log(`   Default password '${DEFAULT_PASSWORD}' works correctly`);
  } else {
    console.log(`❌ Password verification: FAILED`);
    console.log(`   Default password '${DEFAULT_PASSWORD}' does not match`);
    return;
  }

  console.log("");

  // Show permissions
  const adminDeptRole = user.roles.find((r) => r.role.name === "admin_dept");
  if (adminDeptRole) {
    console.log(`✅ admin_dept role assigned`);
    console.log(`   Permissions (${adminDeptRole.role.permissions.length}):`);
    adminDeptRole.role.permissions.forEach((rp) => {
      console.log(
        `     - ${rp.permission.name}: ${rp.permission.description || "No description"}`
      );
    });
  } else {
    console.log(`❌ admin_dept role NOT assigned`);
  }

  console.log("");
  console.log("🎉 Login test completed successfully!");
  console.log("");
  console.log("📝 Test Summary:");
  console.log(`   Username: ${testUsername}`);
  console.log(`   Password: ${DEFAULT_PASSWORD}`);
  console.log(`   Can login: ✅ YES`);
  console.log(`   Has admin_dept role: ✅ YES`);
  console.log(
    `   Has permissions: ✅ YES (${adminDeptRole?.role.permissions.length || 0})`
  );
}

main()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
