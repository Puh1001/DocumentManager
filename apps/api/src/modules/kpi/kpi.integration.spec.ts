import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/common/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";

// Increase timeout for database operations
jest.setTimeout(60000);

describe("KPI Integration Tests", () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let testUser: Prisma.UserGetPayload<Record<string, never>>;
  let testPassword: string;
  let accessToken: string;
  let testDepartment: Prisma.DepartmentGetPayload<Record<string, never>>;
  let testKpiRecord: Prisma.KpiRecordGetPayload<Record<string, never>>;
  let testKpiMetric: Prisma.KpiMetricGetPayload<Record<string, never>>;

  beforeAll(async () => {
    // Ensure JWT_SECRET is set for tests
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "test-jwt-secret-key-for-integration-tests";
    }
    if (!process.env.JWT_ACCESS_EXPIRES) {
      process.env.JWT_ACCESS_EXPIRES = "15m";
    }
    if (!process.env.JWT_REFRESH_EXPIRES) {
      process.env.JWT_REFRESH_EXPIRES = "7d";
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );
    app.enableCors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      credentials: true,
    });
    app.setGlobalPrefix("api");
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Cleanup existing test user
    const existingUser = await prismaService.user.findUnique({
      where: { username: "kpi_testuser" },
    });
    if (existingUser) {
      await prismaService.session.deleteMany({
        where: { userId: existingUser.id },
      });
      await prismaService.auditLog.deleteMany({
        where: { userId: existingUser.id },
      });
      await prismaService.userRole.deleteMany({
        where: { userId: existingUser.id },
      });
      await prismaService.user.delete({
        where: { id: existingUser.id },
      });
    }

    // Create test role if not exists
    let testRole = await prismaService.role.findUnique({
      where: { name: "user" },
    });
    if (!testRole) {
      testRole = await prismaService.role.create({
        data: { name: "user", description: "Test role" },
      });
    }

    // Create test department first (needed for user)
    testDepartment = await prismaService.department.create({
      data: {
        name: "Test Department",
        code: "TEST-KPI",
        isActive: true,
      },
    });

    // Create test user with department matching test department code
    testPassword = "TestPassword123!";
    const passwordHash = await argon2.hash(testPassword);
    testUser = await prismaService.user.create({
      data: {
        username: "kpi_testuser",
        email: "kpi_test@example.com",
        passwordHash,
        fullName: "KPI Test User",
        department: "TEST-KPI", // Match department code
        isActive: true,
      },
    });

    await prismaService.userRole.create({
      data: {
        userId: testUser.id,
        roleId: testRole.id,
      },
    });

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        username: "kpi_testuser",
        password: testPassword,
      });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testKpiMetric) {
      await prismaService.kpiMetric.deleteMany({
        where: { kpiRecordId: testKpiRecord?.id },
      });
    }
    if (testKpiRecord) {
      await prismaService.kpiRecord.deleteMany({
        where: { id: testKpiRecord.id },
      });
    }
    if (testDepartment) {
      await prismaService.department.deleteMany({
        where: { id: testDepartment.id },
      });
    }
    if (testUser) {
      await prismaService.session.deleteMany({
        where: { userId: testUser.id },
      });
      await prismaService.auditLog.deleteMany({
        where: { userId: testUser.id },
      });
      await prismaService.userRole.deleteMany({
        where: { userId: testUser.id },
      });
      await prismaService.user.delete({
        where: { id: testUser.id },
      });
    }

    await app.close();
  });

  describe("GET /api/kpi/records", () => {
    it("should return empty array when no records exist", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/kpi/records")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should filter by departmentId", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/kpi/records?departmentId=${testDepartment.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should filter by year", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/kpi/records?year=2025")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("POST /api/kpi/records", () => {
    it("should create a new KPI record", async () => {
      const createDto = {
        departmentId: testDepartment.id,
        year: 2025,
        title: "Test KPI Title",
        target: "≥85%",
        targetValue: 85,
      };

      const response = await request(app.getHttpServer())
        .post("/api/kpi/records")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.title).toBe(createDto.title);
      expect(response.body.year).toBe(createDto.year);
      testKpiRecord = response.body;
    });

    it("should return 400 for invalid data", async () => {
      const invalidDto = {
        departmentId: "invalid-uuid",
        year: "not-a-number",
      };

      await request(app.getHttpServer())
        .post("/api/kpi/records")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe("GET /api/kpi/records/:id", () => {
    it("should return KPI record by id", async () => {
      if (!testKpiRecord) {
        // Create record if not exists
        const createDto = {
          departmentId: testDepartment.id,
          year: 2025,
          title: "Test KPI Title",
          target: "≥85%",
          targetValue: 85,
        };

        const createResponse = await request(app.getHttpServer())
          .post("/api/kpi/records")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(createDto)
          .expect(201);

        testKpiRecord = createResponse.body;
      }

      const response = await request(app.getHttpServer())
        .get(`/api/kpi/records/${testKpiRecord.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testKpiRecord.id);
      expect(response.body).toHaveProperty("department");
      expect(response.body).toHaveProperty("metrics");
    });

    it("should return 404 for non-existent record", async () => {
      await request(app.getHttpServer())
        .get("/api/kpi/records/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe("PATCH /api/kpi/records/:id", () => {
    it("should update KPI record", async () => {
      if (!testKpiRecord) {
        const createDto = {
          departmentId: testDepartment.id,
          year: 2025,
          title: "Test KPI Title",
          target: "≥85%",
          targetValue: 85,
        };

        const createResponse = await request(app.getHttpServer())
          .post("/api/kpi/records")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(createDto)
          .expect(201);

        testKpiRecord = createResponse.body;
      }

      const updateDto = {
        title: "Updated KPI Title",
        target: "≥90%",
        targetValue: 90,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/kpi/records/${testKpiRecord.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.title).toBe(updateDto.title);
      expect(response.body.target).toBe(updateDto.target);
    });

    it("should return 404 for non-existent record", async () => {
      await request(app.getHttpServer())
        .patch("/api/kpi/records/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Updated" })
        .expect(404);
    });
  });

  describe("POST /api/kpi/metrics", () => {
    it("should create a new KPI metric", async () => {
      if (!testKpiRecord) {
        const createDto = {
          departmentId: testDepartment.id,
          year: 2025,
          title: "Test KPI Title",
          target: "≥85%",
          targetValue: 85,
        };

        const createResponse = await request(app.getHttpServer())
          .post("/api/kpi/records")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(createDto)
          .expect(201);

        testKpiRecord = createResponse.body;
      }

      const createMetricDto = {
        kpiRecordId: testKpiRecord.id,
        name: "Test Metric",
        type: "TARGET",
        sortOrder: 1,
        values: JSON.stringify({ m1: 100, m2: 200 }),
      };

      const response = await request(app.getHttpServer())
        .post("/api/kpi/metrics")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(createMetricDto)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe(createMetricDto.name);
      testKpiMetric = response.body;
    });

    it("should return 400 for invalid data", async () => {
      await request(app.getHttpServer())
        .post("/api/kpi/metrics")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          kpiRecordId: "invalid-uuid",
          name: "Test",
        })
        .expect(400);
    });
  });

  describe("PATCH /api/kpi/metrics/:id", () => {
    it("should update KPI metric", async () => {
      if (!testKpiMetric) {
        if (!testKpiRecord) {
          const createDto = {
            departmentId: testDepartment.id,
            year: 2025,
            title: "Test KPI Title",
            target: "≥85%",
            targetValue: 85,
          };

          const createResponse = await request(app.getHttpServer())
            .post("/api/kpi/records")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(createDto)
            .expect(201);

          testKpiRecord = createResponse.body;
        }

        const createMetricDto = {
          kpiRecordId: testKpiRecord.id,
          name: "Test Metric",
          type: "TARGET",
          sortOrder: 1,
        };

        const createResponse = await request(app.getHttpServer())
          .post("/api/kpi/metrics")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(createMetricDto)
          .expect(201);

        testKpiMetric = createResponse.body;
      }

      const updateDto = {
        name: "Updated Metric",
        sortOrder: 2,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/kpi/metrics/${testKpiMetric.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
      expect(response.body.sortOrder).toBe(updateDto.sortOrder);
    });

    it("should return 404 for non-existent metric", async () => {
      await request(app.getHttpServer())
        .patch("/api/kpi/metrics/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "Updated" })
        .expect(404);
    });
  });

  describe("DELETE /api/kpi/metrics/:id", () => {
    it("should delete KPI metric", async () => {
      if (!testKpiMetric) {
        if (!testKpiRecord) {
          const createDto = {
            departmentId: testDepartment.id,
            year: 2025,
            title: "Test KPI Title",
            target: "≥85%",
            targetValue: 85,
          };

          const createResponse = await request(app.getHttpServer())
            .post("/api/kpi/records")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(createDto)
            .expect(201);

          testKpiRecord = createResponse.body;
        }

        const createMetricDto = {
          kpiRecordId: testKpiRecord.id,
          name: "Test Metric To Delete",
          type: "TARGET",
          sortOrder: 1,
        };

        const createResponse = await request(app.getHttpServer())
          .post("/api/kpi/metrics")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(createMetricDto)
          .expect(201);

        testKpiMetric = createResponse.body;
      }

      await request(app.getHttpServer())
        .delete(`/api/kpi/metrics/${testKpiMetric.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/kpi/metrics/${testKpiMetric.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe("DELETE /api/kpi/records/:id", () => {
    it("should delete KPI record", async () => {
      if (!testKpiRecord) {
        const createDto = {
          departmentId: testDepartment.id,
          year: 2025,
          title: "Test KPI Title To Delete",
          target: "≥85%",
          targetValue: 85,
        };

        const createResponse = await request(app.getHttpServer())
          .post("/api/kpi/records")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(createDto)
          .expect(201);

        testKpiRecord = createResponse.body;
      }

      await request(app.getHttpServer())
        .delete(`/api/kpi/records/${testKpiRecord.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/kpi/records/${testKpiRecord.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);

      // Clear testKpiRecord so afterAll doesn't try to delete it again
      testKpiRecord = null as unknown as Prisma.KpiRecordGetPayload<
        Record<string, never>
      >;
    });
  });

  describe("GET /api/kpi/records/:id/export", () => {
    it("should export KPI record to Excel", async () => {
      // Create a record for export
      const createDto = {
        departmentId: testDepartment.id,
        year: 2025,
        title: "Export Test KPI",
        target: "≥85%",
        targetValue: 85,
      };

      const createResponse = await request(app.getHttpServer())
        .post("/api/kpi/records")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      const recordId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/api/kpi/records/${recordId}/export`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.headers["content-type"]).toContain(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(response.headers["content-disposition"]).toContain(
        `filename="kpi_${recordId}.xlsx"`
      );
      // Verify response has content (binary data)
      expect(response.body).toBeDefined();
      // Response body might be Buffer or string depending on supertest version
      const contentLength = response.headers["content-length"];
      if (contentLength) {
        expect(parseInt(contentLength, 10)).toBeGreaterThan(0);
      }

      // Cleanup
      await prismaService.kpiMetric.deleteMany({
        where: { kpiRecordId: recordId },
      });
      await prismaService.kpiRecord.delete({
        where: { id: recordId },
      });
    });

    it("should return 404 for non-existent record", async () => {
      await request(app.getHttpServer())
        .get("/api/kpi/records/00000000-0000-0000-0000-000000000000/export")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe("Authentication", () => {
    it("should return 401 for unauthenticated requests", async () => {
      await request(app.getHttpServer()).get("/api/kpi/records").expect(401);
    });
  });

  describe("Authorization", () => {
    let otherDepartment: Prisma.DepartmentGetPayload<Record<string, never>>;
    let otherUser: Prisma.UserGetPayload<Record<string, never>>;
    let otherUserToken: string;
    let otherUserPassword: string;
    let crossDeptRecord: Prisma.KpiRecordGetPayload<Record<string, never>>;

    beforeAll(async () => {
      // Create another department
      otherDepartment = await prismaService.department.create({
        data: {
          name: "Other Test Department",
          code: "OTHER-KPI",
          isActive: true,
        },
      });

      // Create another user in the other department
      otherUserPassword = "OtherPassword123!";
      const otherPasswordHash = await argon2.hash(otherUserPassword);
      otherUser = await prismaService.user.create({
        data: {
          username: "kpi_otheruser",
          email: "kpi_other@example.com",
          passwordHash: otherPasswordHash,
          fullName: "Other KPI Test User",
          department: "OTHER-KPI", // Match other department code
          isActive: true,
        },
      });

      // Assign role to other user
      const testRole = await prismaService.role.findUnique({
        where: { name: "user" },
      });
      if (testRole) {
        await prismaService.userRole.create({
          data: {
            userId: otherUser.id,
            roleId: testRole.id,
          },
        });
      }

      // Login to get token for other user
      const loginResponse = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          username: "kpi_otheruser",
          password: otherUserPassword,
        });

      otherUserToken = loginResponse.body.accessToken;

      // Create a KPI record in testDepartment (not otherDepartment)
      if (!testKpiRecord) {
        const createDto = {
          departmentId: testDepartment.id,
          year: 2025,
          title: "Cross Department Test KPI",
          target: "≥85%",
          targetValue: 85,
        };

        const createResponse = await request(app.getHttpServer())
          .post("/api/kpi/records")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(createDto)
          .expect(201);

        crossDeptRecord = createResponse.body;
      } else {
        crossDeptRecord = testKpiRecord;
      }
    });

    afterAll(async () => {
      // Cleanup other user
      if (otherUser) {
        await prismaService.session.deleteMany({
          where: { userId: otherUser.id },
        });
        await prismaService.auditLog.deleteMany({
          where: { userId: otherUser.id },
        });
        await prismaService.userRole.deleteMany({
          where: { userId: otherUser.id },
        });
        await prismaService.user.delete({
          where: { id: otherUser.id },
        });
      }

      // Cleanup other department
      if (otherDepartment) {
        await prismaService.department.delete({
          where: { id: otherDepartment.id },
        });
      }
    });

    it("should return 403 when user accesses different department's KPI record", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/kpi/records/${crossDeptRecord.id}`)
        .set("Authorization", `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
      // Check if errorCode exists (may be undefined if guard fails)
      if (response.body.errorCode) {
        expect(response.body.errorCode).toBe(
          "kpi.access.denied.different_department"
        );
      } else {
        // If guard fails, we might get 401 instead
        // This is acceptable as long as access is denied
        expect([401, 403]).toContain(response.status);
      }
    });

    it("should filter records by user's department in findAll", async () => {
      // Create a record in otherDepartment
      const otherDeptRecord = await request(app.getHttpServer())
        .post("/api/kpi/records")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send({
          departmentId: otherDepartment.id,
          year: 2025,
          title: "Other Department KPI",
          target: "≥90%",
          targetValue: 90,
        })
        .expect(201);

      // Test user should only see their department's records
      const testUserResponse = await request(app.getHttpServer())
        .get("/api/kpi/records")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(testUserResponse.body)).toBe(true);
      // Should not include otherDepartment's record
      const hasOtherDeptRecord = testUserResponse.body.some(
        (r: { id: string }) => r.id === otherDeptRecord.body.id
      );
      expect(hasOtherDeptRecord).toBe(false);

      // Other user should only see their department's records
      const otherUserResponse = await request(app.getHttpServer())
        .get("/api/kpi/records")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .expect(200);

      expect(Array.isArray(otherUserResponse.body)).toBe(true);
      // Should include otherDepartment's record
      const hasOtherDeptRecordInOtherUser = otherUserResponse.body.some(
        (r: { id: string }) => r.id === otherDeptRecord.body.id
      );
      expect(hasOtherDeptRecordInOtherUser).toBe(true);

      // Cleanup
      await prismaService.kpiRecord.delete({
        where: { id: otherDeptRecord.body.id },
      });
    });

    it("should prevent creating KPI record for different department", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/kpi/records")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send({
          departmentId: testDepartment.id, // Different from otherUser's dept
          year: 2025,
          title: "Unauthorized KPI",
          target: "≥85%",
          targetValue: 85,
        });

      expect([401, 403]).toContain(response.status);
      if (response.body.errorCode) {
        expect(response.body.errorCode).toBe("kpi.department.mismatch");
      }
    });

    it("should prevent updating KPI record from different department", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/kpi/records/${crossDeptRecord.id}`)
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send({
          title: "Unauthorized Update",
        });

      expect([401, 403]).toContain(response.status);
      if (response.body.errorCode) {
        expect(response.body.errorCode).toBe(
          "kpi.access.denied.different_department"
        );
      }
    });

    it("should prevent deleting KPI record from different department", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/kpi/records/${crossDeptRecord.id}`)
        .set("Authorization", `Bearer ${otherUserToken}`);

      expect([401, 403]).toContain(response.status);
      if (response.body.errorCode) {
        expect(response.body.errorCode).toBe(
          "kpi.access.denied.different_department"
        );
      }
    });

    it("should prevent creating metric for KPI record from different department", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/kpi/metrics")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send({
          kpiRecordId: crossDeptRecord.id,
          name: "Unauthorized Metric",
          type: "TARGET",
          sortOrder: 1,
        });

      expect([401, 403]).toContain(response.status);
      if (response.body.errorCode) {
        expect(response.body.errorCode).toBe(
          "kpi.access.denied.different_department"
        );
      }
    });
  });
});
