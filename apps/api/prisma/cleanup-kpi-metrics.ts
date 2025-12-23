import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning up old KPI metric names...");

  // Find all metrics with old weaving-specific names
  const oldNames = [
    "理论转机数量",
    "转机实际",
    "Số máy cần chuyển",
    "Số máy thực tế chuyển",
    "理论转机数量 (台)",
    "转机实际 (台)",
    "理论转机数量 (台) Số máy cần chuyển (máy)",
    "转机实际 (台) Số máy thực tế chuyển (máy)",
  ];

  let updatedCount = 0;

  // Get all metrics
  const allMetrics = await prisma.kpiMetric.findMany({
    include: {
      kpiRecord: {
        include: {
          department: true,
        },
      },
    },
  });

  for (const metric of allMetrics) {
    let shouldUpdate = false;
    let newName = metric.name;

    // Check if metric name contains any old weaving-specific text
    for (const oldName of oldNames) {
      if (metric.name.includes(oldName)) {
        shouldUpdate = true;
        break;
      }
    }

    // Also check for "chuyển máy" (machine transfer) which is weaving-specific
    if (metric.name.toLowerCase().includes("chuyển máy")) {
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      // Update based on type and sortOrder
      if (metric.type === "TARGET") {
        newName = "Tiêu chí 1";
      } else if (metric.type === "ACTUAL") {
        newName = "Tiêu chí 2";
      } else {
        newName = `Tiêu chí ${metric.sortOrder}`;
      }

      await prisma.kpiMetric.update({
        where: { id: metric.id },
        data: { name: newName },
      });
      updatedCount++;
      console.log(
        `  ✅ Updated metric ${metric.id} (${metric.kpiRecord.department.name}, sortOrder: ${metric.sortOrder}): "${metric.name}" → "${newName}"`
      );
    }
  }

  console.log(`✅ Cleaned up ${updatedCount} KPI metrics`);
  console.log("🎉 Cleanup completed!");
}

main()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

