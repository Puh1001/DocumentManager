import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

/**
 * Department code mapping from users.txt to existing database codes
 */
const DEPARTMENT_CODE_MAP: Record<string, string> = {
  YDF: "GIAI_DOAN_SAU_NHUOM_SOI", // Sau nhuộm sợi
  TL: "PHONG_KIEM_NGHIEM", // Kiểm nghiệm
  WH: "KHO", // Kho
  SHD: "XNK", // Xuất nhập khẩu
  PMC: "PMC", // PMC
  PUR: "THU_MUA", // Thu mua
  PW: "GIAI_DOAN_TRUOC_NHUOM_SOI", // Trước nhuộm sợi
  SS: "DINH_HINH", // Định hình
  PT: "IN_HOA", // In Hoa
  WK: "DET_NGANG", // Dệt Ngang
  EG: "CONG_TRINH", // Công Trình
  SD: "KINH_DOANH", // Kinh Doanh
  "Qc vải": "QC_VAI", // QC vải
  WA: "DET_DOC", // Dệt Dọc
  QA: "QA", // QA
  "QC đai": "QC_DAI", // QC đai
  AC: "KE_TOAN", // Kế Toán
  DH: "NHUOM_VAI", // Nhuộm vải
  WV: "DET_DAI", // Dệt Đai
  WS: "MG", // WS (mapped to MG)
  DF: "NHUOM_DAI", // Nhuộm đai
  LTB: "LTB", // LTB
  "Phòng thí nghiệm": "PHONG_THI_NGHIEM", // Phòng thí nghiệm
  CV: "BOC_SOI", // Bọc sợi
  WD: "KEO_SOI", // Kéo sợi
  HR: "HCNS", // Nhân sự
  IT: "IT", // Công nghệ
};

/**
 * User data from users.txt
 * STT | Họ Tên | MNV | Bộ phận
 */
const USERS_DATA = [
  {
    stt: 1,
    fullName: "Phạm Văn Mạnh",
    employeeId: "V210889",
    deptCode: "YDF",
    deptName: "Sau nhuộm sợi",
  },
  {
    stt: 2,
    fullName: "Nguyễn Thị Hoa",
    employeeId: "V191258",
    deptCode: "TL",
    deptName: "Kiểm nghiệm",
  },
  {
    stt: 3,
    fullName: "Đào Thu Trang",
    employeeId: "V250711",
    deptCode: "WH",
    deptName: "Kho",
  },
  {
    stt: 4,
    fullName: "Lê Thị Thủy",
    employeeId: "V180374",
    deptCode: "SHD",
    deptName: "Xuất nhập khẩu",
  },
  {
    stt: 5,
    fullName: "Đào Thị Thảo",
    employeeId: "V200849",
    deptCode: "PMC",
    deptName: "PMC",
  },
  {
    stt: 6,
    fullName: "Cao Thị Hải Yến",
    employeeId: "V180985",
    deptCode: "PUR",
    deptName: "Thu mua",
  },
  {
    stt: 7,
    fullName: "Đặng Thị Mỹ Hạnh",
    employeeId: "V180598",
    deptCode: "PUR",
    deptName: "Thu mua",
  },
  {
    stt: 8,
    fullName: "Nguyễn Thị Thủy",
    employeeId: "V231080",
    deptCode: "PW",
    deptName: "Trước nhuộm sợi",
  },
  {
    stt: 9,
    fullName: "Nguyễn Thị Ngọc Anh",
    employeeId: "V201182",
    deptCode: "SS",
    deptName: "Định hình",
  },
  {
    stt: 10,
    fullName: "Nguyễn Thị Nga",
    employeeId: "V220142",
    deptCode: "PT",
    deptName: "In Hoa",
  },
  {
    stt: 11,
    fullName: "LIU KUANG BING",
    employeeId: "B181613",
    deptCode: "PT",
    deptName: "In Hoa",
  },
  {
    stt: 12,
    fullName: "Tan Yi Qiang",
    employeeId: "V170331",
    deptCode: "WK",
    deptName: "Dệt Ngang",
  },
  {
    stt: 13,
    fullName: "Phạm Thị Huệ",
    employeeId: "V180761",
    deptCode: "WK",
    deptName: "Dệt Ngang",
  },
  {
    stt: 14,
    fullName: "Nguyễn Thị Thùy",
    employeeId: "V231105",
    deptCode: "WK",
    deptName: "Dệt Ngang",
  },
  {
    stt: 15,
    fullName: "Nguyễn Thị Lệ Quyên",
    employeeId: "V240755",
    deptCode: "WK",
    deptName: "Dệt Ngang",
  },
  {
    stt: 16,
    fullName: "Vũ Anh Tuân",
    employeeId: "V230690",
    deptCode: "EG",
    deptName: "Công Trình",
  },
  {
    stt: 17,
    fullName: "Đặng Văn Hung",
    employeeId: "V170072",
    deptCode: "EG",
    deptName: "Công Trình",
  },
  {
    stt: 18,
    fullName: "Vũ Đức Đạt",
    employeeId: "V180619",
    deptCode: "EG",
    deptName: "Công Trình",
  },
  {
    stt: 19,
    fullName: "Nguyễn Văn Thặng",
    employeeId: "V170125",
    deptCode: "EG",
    deptName: "Công Trình",
  },
  {
    stt: 20,
    fullName: "Vũ Lan Anh",
    employeeId: "V211192",
    deptCode: "EG",
    deptName: "Công Trình",
  },
  {
    stt: 21,
    fullName: "Đào Quỳnh Mai",
    employeeId: "V251075",
    deptCode: "EG",
    deptName: "Công Trình",
  },
  {
    stt: 22,
    fullName: "Phạm Thị Diệu Linh",
    employeeId: "V240600",
    deptCode: "SD",
    deptName: "Kinh Doanh",
  },
  {
    stt: 23,
    fullName: "Nguyễn Thị Niên",
    employeeId: "V240440",
    deptCode: "Qc vải",
    deptName: "QC vải",
  },
  {
    stt: 24,
    fullName: "Nguyễn Thị Huyền",
    employeeId: "V190047",
    deptCode: "WA",
    deptName: "Dệt Dọc",
  },
  {
    stt: 25,
    fullName: "Nguyễn Kim Anh",
    employeeId: "V221225",
    deptCode: "WA",
    deptName: "Dệt Dọc",
  },
  {
    stt: 26,
    fullName: "Cao Thị Ngọc Oanh",
    employeeId: "V241211",
    deptCode: "WA",
    deptName: "Dệt Dọc",
  },
  {
    stt: 27,
    fullName: "Nguyễn Thị Thoan",
    employeeId: "V231067",
    deptCode: "WA",
    deptName: "Dệt Dọc",
  },
  {
    stt: 28,
    fullName: "Lương Thị Thuận",
    employeeId: "V180375",
    deptCode: "QA",
    deptName: "QA",
  },
  {
    stt: 29,
    fullName: "Thẩm Thị Xuyến",
    employeeId: "V190428",
    deptCode: "QC đai",
    deptName: "QC đai",
  },
  {
    stt: 30,
    fullName: "Nguyễn Thị KIm Dung",
    employeeId: "V250648",
    deptCode: "QC đai",
    deptName: "QC đai",
  },
  {
    stt: 31,
    fullName: "Đỗ Thị Minh Anh",
    employeeId: "V251546",
    deptCode: "AC",
    deptName: "kế Toán",
  },
  {
    stt: 32,
    fullName: "Nhữ Thị Dung",
    employeeId: "V200977",
    deptCode: "DH",
    deptName: "Nhuộm vải",
  },
  {
    stt: 33,
    fullName: "Phùng Thị Vui",
    employeeId: "V170043",
    deptCode: "WV",
    deptName: "Dệt  Đai",
  },
  {
    stt: 34,
    fullName: "Lê Thị Ngọc Thu",
    employeeId: "V231026",
    deptCode: "WV",
    deptName: "Dệt  Đai",
  },
  {
    stt: 35,
    fullName: "Đỗ Thị Thoa",
    employeeId: "V240766",
    deptCode: "WV",
    deptName: "Dệt  Đai",
  },
  {
    stt: 36,
    fullName: "Trần Thị Trang",
    employeeId: "V240826",
    deptCode: "WV",
    deptName: "Dệt  Đai",
  },
  {
    stt: 37,
    fullName: "Nguyễn Văn Đảm",
    employeeId: "V170174",
    deptCode: "WS",
    deptName: "WS",
  },
  {
    stt: 38,
    fullName: "Cháng Văn Cường",
    employeeId: "V190986",
    deptCode: "DF",
    deptName: "Nhuộm đai",
  },
  {
    stt: 39,
    fullName: "Trần Thị Quỳnh",
    employeeId: "V201512",
    deptCode: "DF",
    deptName: "Nhuộm đai",
  },
  {
    stt: 40,
    fullName: "Mai Thị Hòa",
    employeeId: "V251235",
    deptCode: "LTB",
    deptName: "LTB",
  },
  {
    stt: 41,
    fullName: "Quách Thị Hồng Nhung",
    employeeId: "V180913",
    deptCode: "LTB",
    deptName: "LTB",
  },
  {
    stt: 42,
    fullName: "Lại Tư Hoàng",
    employeeId: "V180553",
    deptCode: "Phòng thí nghiệm",
    deptName: "Phòng thí nghiệm",
  },
  {
    stt: 43,
    fullName: "Nguyễn Ngọc Cương",
    employeeId: "V170234",
    deptCode: "CV",
    deptName: "Bọc sợi",
  },
  {
    stt: 44,
    fullName: "Nguyễn Thị Oanh",
    employeeId: "V190985",
    deptCode: "CV",
    deptName: "Bọc sợi",
  },
  {
    stt: 45,
    fullName: "Hoàng Thị Điền",
    employeeId: "V231108",
    deptCode: "WD",
    deptName: "Kéo sợi",
  },
  {
    stt: 46,
    fullName: "Nguyễn Thị Lan",
    employeeId: "V240774",
    deptCode: "WD",
    deptName: "Kéo sợi",
  },
  {
    stt: 47,
    fullName: "Vũ Thị Nhung",
    employeeId: "V240487",
    deptCode: "HR",
    deptName: "Nhân sự",
  },
  {
    stt: 48,
    fullName: "Bùi Thị Ngoan",
    employeeId: "V210817",
    deptCode: "IT",
    deptName: "Công nghệ",
  },
  {
    stt: 49,
    fullName: "Lê Văn Sơn",
    employeeId: "V170192",
    deptCode: "IT",
    deptName: "Công nghệ",
  },
  {
    stt: 50,
    fullName: "郑志芳(Zheng Zhifang)",
    employeeId: "B250964",
    deptCode: "HR",
    deptName: "Nhân sự",
  },
];

const DEFAULT_PASSWORD = "bpvn@123$$";
const ADMIN_DEPT_ROLE_NAME = "admin_dept";

async function main() {
  console.log("🌱 Starting admin_dept users migration...");

  // 1. Ensure admin_dept role exists
  let adminDeptRole = await prisma.role.findUnique({
    where: { name: ADMIN_DEPT_ROLE_NAME },
  });

  if (!adminDeptRole) {
    console.log(`⚠️  Role '${ADMIN_DEPT_ROLE_NAME}' not found. Creating...`);
    adminDeptRole = await prisma.role.create({
      data: {
        name: ADMIN_DEPT_ROLE_NAME,
        description:
          "Department administrator with permissions to manage department data",
      },
    });
    console.log(`✅ Role '${ADMIN_DEPT_ROLE_NAME}' created`);
  } else {
    console.log(`✅ Role '${ADMIN_DEPT_ROLE_NAME}' already exists`);
  }

  // 2. Hash default password once
  const passwordHash = await argon2.hash(DEFAULT_PASSWORD);
  console.log(`✅ Password hashed`);

  // 3. Migrate users
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const userData of USERS_DATA) {
    try {
      const username = userData.employeeId.toLowerCase();
      const email = `${username}@bpvn.com`;

      // Map department code
      const mappedDeptCode = DEPARTMENT_CODE_MAP[userData.deptCode];
      if (!mappedDeptCode) {
        console.warn(
          `⚠️  [${userData.stt}] No department mapping for '${userData.deptCode}' (${userData.fullName}). Using original code.`
        );
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        // Update existing user
        await prisma.user.update({
          where: { username },
          data: {
            fullName: userData.fullName,
            department: mappedDeptCode || userData.deptCode,
            // Do NOT update password for existing users
          },
        });

        // Ensure role is assigned
        const existingUserRole = await prisma.userRole.findUnique({
          where: {
            userId_roleId: {
              userId: existingUser.id,
              roleId: adminDeptRole.id,
            },
          },
        });

        if (!existingUserRole) {
          await prisma.userRole.create({
            data: {
              userId: existingUser.id,
              roleId: adminDeptRole.id,
            },
          });
        }

        updated++;
        console.log(
          `✅ [${userData.stt}] Updated: ${userData.fullName} (${username}) - ${mappedDeptCode || userData.deptCode}`
        );
      } else {
        // Create new user
        const newUser = await prisma.user.create({
          data: {
            username,
            email,
            passwordHash,
            fullName: userData.fullName,
            department: mappedDeptCode || userData.deptCode,
            isActive: true,
          },
        });

        // Assign admin_dept role
        await prisma.userRole.create({
          data: {
            userId: newUser.id,
            roleId: adminDeptRole.id,
          },
        });

        created++;
        console.log(
          `✅ [${userData.stt}] Created: ${userData.fullName} (${username}) - ${mappedDeptCode || userData.deptCode}`
        );
      }
    } catch (error) {
      errors++;
      console.error(
        `❌ [${userData.stt}] Error processing ${userData.fullName} (${userData.employeeId}):`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log("\n📊 Migration Summary:");
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors:  ${errors}`);
  console.log(`   Total:   ${USERS_DATA.length}`);

  if (errors === 0) {
    console.log("\n🎉 Migration completed successfully!");
  } else {
    console.log("\n⚠️  Migration completed with errors. Please review.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
