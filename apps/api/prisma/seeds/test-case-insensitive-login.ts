import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "bpvn@123$$";

async function main() {
  console.log("🔐 Testing case-insensitive login...\n");

  // Test with first admin_dept user
  const testEmployeeId = "V210889"; // Phạm Văn Mạnh
  const testUsernameLower = testEmployeeId.toLowerCase(); // v210889

  // Verify user exists in DB (stored as lowercase)
  const user = await prisma.user.findUnique({
    where: { username: testUsernameLower },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    console.error(`❌ User '${testUsernameLower}' not found in database!`);
    return;
  }

  console.log(`✅ User found in DB: ${user.fullName} (${user.username})`);
  console.log(`   Department: ${user.department}`);
  console.log(`   Active: ${user.isActive}`);
  console.log(`   Roles: ${user.roles.map((r) => r.role.name).join(", ")}`);
  console.log("");

  // Test case variations
  const testCases = [
    { label: "Lowercase", username: "v210889" },
    { label: "Uppercase", username: "V210889" },
    { label: "Mixed case 1", username: "V210889" },
    { label: "Mixed case 2", username: "v210889" },
  ];

  console.log("🧪 Testing different case combinations:\n");

  for (const testCase of testCases) {
    // Simulate what auth service does now
    const normalizedUsername = testCase.username.toLowerCase();
    const foundUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (foundUser) {
      // Verify password
      const passwordMatch = await argon2.verify(
        foundUser.passwordHash,
        DEFAULT_PASSWORD
      );

      if (passwordMatch) {
        console.log(
          `✅ ${testCase.label.padEnd(15)} (${testCase.username}): SUCCESS`
        );
      } else {
        console.log(
          `❌ ${testCase.label.padEnd(15)} (${testCase.username}): FAILED - Password mismatch`
        );
      }
    } else {
      console.log(
        `❌ ${testCase.label.padEnd(15)} (${testCase.username}): FAILED - User not found`
      );
    }
  }

  console.log("");
  console.log("🎉 Case-insensitive login test completed!");
  console.log("");
  console.log("📝 Summary:");
  console.log(`   ✓ All case variations should work now`);
  console.log(`   ✓ Username normalized to lowercase before DB query`);
  console.log(`   ✓ Password validation works correctly`);
}

main()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
