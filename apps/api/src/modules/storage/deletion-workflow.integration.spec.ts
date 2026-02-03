import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/common/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";

// Increase timeout for integration tests
jest.setTimeout(60000);

describe("Deletion Workflow Integration Tests", () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let testUser: Prisma.UserGetPayload<Record<string, never>>;
  let dccUser: Prisma.UserGetPayload<Record<string, never>>;
  let accessToken: string;
  let dccAccessToken: string;
  let testFolder: Prisma.FolderGetPayload<Record<string, never>>;
  let testDepartment: Prisma.DepartmentGetPayload<Record<string, never>>;
  let testLevelId: string;

  const createdResources: {
    documents: string[];
    folders: string[];
    users: string[];
    departments: string[];
    deletionRequests: string[];
  } = {
    documents: [],
    folders: [],
    users: [],
    departments: [],
    deletionRequests: [],
  };

  beforeAll(async () => {
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = "test";
    }
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "test-jwt-secret-key-for-integration-tests";
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
      })
    );
    app.setGlobalPrefix("api");
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Create test department
    testDepartment = await prismaService.department.upsert({
      where: { code: "TEST_DELETION" },
      update: {},
      create: {
        code: "TEST_DELETION",
        name: "Test Department for Deletion",
        nameVi: "Test Department for Deletion",
        nameEn: "Test Department for Deletion",
        isActive: true,
      },
    });
    createdResources.departments.push(testDepartment.id);

    // Create test user
    const testPassword = "TestPassword123!";
    const passwordHash = await argon2.hash(testPassword);
    testUser = await prismaService.user.upsert({
      where: { username: "deletion_testuser" },
      update: {},
      create: {
        username: "deletion_testuser",
        email: "deletion_test@example.com",
        passwordHash,
        fullName: "Deletion Test User",
        isActive: true,
      },
    });
    createdResources.users.push(testUser.id);

    // Assign user to department
    await prismaService.userDepartment.upsert({
      where: {
        userId_departmentId: {
          userId: testUser.id,
          departmentId: testDepartment.id,
        },
      },
      update: {},
      create: {
        userId: testUser.id,
        departmentId: testDepartment.id,
      },
    });

    // Create DCC user
    const dccRole = await prismaService.role.upsert({
      where: { name: "dcc" },
      update: {},
      create: {
        name: "dcc",
        description: "Document Control Center",
      },
    });

    const dccPassword = "DCCPassword123!";
    const dccPasswordHash = await argon2.hash(dccPassword);
    dccUser = await prismaService.user.upsert({
      where: { username: "dcc_testuser" },
      update: {},
      create: {
        username: "dcc_testuser",
        email: "dcc_test@example.com",
        passwordHash: dccPasswordHash,
        fullName: "DCC Test User",
        isActive: true,
      },
    });
    createdResources.users.push(dccUser.id);

    await prismaService.userRole.upsert({
      where: {
        userId_roleId: {
          userId: dccUser.id,
          roleId: dccRole.id,
        },
      },
      update: {},
      create: {
        userId: dccUser.id,
        roleId: dccRole.id,
      },
    });

    // Login to get tokens
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        username: "deletion_testuser",
        password: testPassword,
      })
      .expect(200);
    accessToken = loginResponse.body.accessToken;

    const dccLoginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        username: "dcc_testuser",
        password: dccPassword,
      })
      .expect(200);
    dccAccessToken = dccLoginResponse.body.accessToken;

    // Ensure document level exists (LEVEL1) for document.create
    const level = await prismaService.documentLevel.upsert({
      where: { code: "LEVEL1" },
      update: {},
      create: {
        code: "LEVEL1",
        name: "Level 1",
        nameEn: "Level 1",
        isActive: true,
        sortOrder: 1,
      },
    });
    testLevelId = level.id;

    // Create test folder
    testFolder = await prismaService.folder.create({
      data: {
        name: "Test Deletion Folder",
        path: "test-deletion-folder",
        departmentId: testDepartment.id,
      },
    });
    createdResources.folders.push(testFolder.id);
  });

  afterAll(async () => {
    // Cleanup
    await prismaService.deletionRequest.deleteMany({
      where: { id: { in: createdResources.deletionRequests } },
    });
    await prismaService.document.deleteMany({
      where: { id: { in: createdResources.documents } },
    });
    await prismaService.folder.deleteMany({
      where: { id: { in: createdResources.folders } },
    });
    await prismaService.userRole.deleteMany({
      where: { userId: { in: createdResources.users } },
    });
    await prismaService.userDepartment.deleteMany({
      where: { userId: { in: createdResources.users } },
    });
    await prismaService.user.deleteMany({
      where: { id: { in: createdResources.users } },
    });
    await prismaService.department.deleteMany({
      where: { id: { in: createdResources.departments } },
    });

    await app.close();
  });

  describe("Self-Deletion Within 72 Hours", () => {
    it("should allow user to delete their own document within 72 hours", async () => {
      // Upload a document
      const uploadResponse = await request(app.getHttpServer())
        .post("/api/storage/documents/upload")
        .set("Authorization", `Bearer ${accessToken}`)
        .attach("file", Buffer.from("test content"), "test-delete.pdf")
        .field("folderId", testFolder.id)
        .expect(201);

      const documentId = uploadResponse.body.id;
      createdResources.documents.push(documentId);

      // Check deletion status
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/storage/documents/${documentId}/deletion-status`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.canDelete).toBe(true);
      expect(statusResponse.body.isExpired).toBe(false);

      // Delete the document
      await request(app.getHttpServer())
        .delete(`/api/storage/documents/${documentId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      // Verify document is deleted
      const deletedDoc = await prismaService.document.findUnique({
        where: { id: documentId },
      });
      expect(deletedDoc?.status).toBe("DELETED");
    });
  });

  describe("Deletion Request After 72 Hours", () => {
    it("should block deletion and allow request submission after 72 hours", async () => {
      // Create a document uploaded 73 hours ago
      const oldDate = new Date(Date.now() - 73 * 60 * 60 * 1000);
      const expiredDocument = await prismaService.document.create({
        data: {
          name: "Expired Document",
          fileName: "expired-doc.pdf",
          fileType: "pdf",
          fileSize: 1024,
          filePath: "test-folder/expired-doc.pdf",
          checksum: "test-checksum-expired",
          folderId: testFolder.id,
          levelId: testLevelId,
          uploadedBy: testUser.id,
          uploadedAt: oldDate,
          createdAt: oldDate,
          status: "ACTIVE",
        },
      });
      createdResources.documents.push(expiredDocument.id);

      // Attempt delete - should fail
      await request(app.getHttpServer())
        .delete(`/api/storage/documents/${expiredDocument.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(403);

      // Check deletion status
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/storage/documents/${expiredDocument.id}/deletion-status`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.canDelete).toBe(false);
      expect(statusResponse.body.isExpired).toBe(true);
      expect(statusResponse.body.requiresDCCApproval).toBe(true);

      // Submit deletion request
      const requestResponse = await request(app.getHttpServer())
        .post(`/api/storage/documents/${expiredDocument.id}/deletion-requests`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          reason: "Document is outdated and no longer needed",
        })
        .expect(201);

      expect(requestResponse.body.status).toBe("PENDING");
      expect(requestResponse.body.reason).toBe(
        "Document is outdated and no longer needed"
      );
      createdResources.deletionRequests.push(requestResponse.body.id);
    });
  });

  describe("DCC Approval Workflow", () => {
    it("should complete DCC approval workflow", async () => {
      // Create expired document
      const oldDate = new Date(Date.now() - 73 * 60 * 60 * 1000);
      const expiredDocument = await prismaService.document.create({
        data: {
          name: "DCC Test Document",
          fileName: "dcc-test.pdf",
          fileType: "pdf",
          fileSize: 1024,
          filePath: "test-folder/dcc-test.pdf",
          checksum: "test-checksum-dcc",
          folderId: testFolder.id,
          levelId: testLevelId,
          uploadedBy: testUser.id,
          uploadedAt: oldDate,
          createdAt: oldDate,
          status: "ACTIVE",
        },
      });
      createdResources.documents.push(expiredDocument.id);

      // Submit deletion request
      const requestResponse = await request(app.getHttpServer())
        .post(`/api/storage/documents/${expiredDocument.id}/deletion-requests`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          reason: "Document needs to be removed",
        })
        .expect(201);

      const requestId = requestResponse.body.id;
      createdResources.deletionRequests.push(requestId);

      // DCC lists pending requests
      const listResponse = await request(app.getHttpServer())
        .get("/api/storage/deletion-requests")
        .set("Authorization", `Bearer ${dccAccessToken}`)
        .expect(200);

      expect(Array.isArray(listResponse.body)).toBe(true);
      const pendingRequest = listResponse.body.find(
        (r: { id: string }) => r.id === requestId
      );
      expect(pendingRequest).toBeDefined();
      expect(pendingRequest.status).toBe("PENDING");

      // DCC approves request
      await request(app.getHttpServer())
        .post(`/api/storage/deletion-requests/${requestId}/review`)
        .set("Authorization", `Bearer ${dccAccessToken}`)
        .send({
          approve: true,
          comment: "Approved for deletion",
        })
        .expect(200);

      // Verify document is deleted
      const deletedDoc = await prismaService.document.findUnique({
        where: { id: expiredDocument.id },
      });
      expect(deletedDoc?.status).toBe("DELETED");

      // Verify request is approved
      const approvedRequest = await prismaService.deletionRequest.findUnique({
        where: { id: requestId },
      });
      expect(approvedRequest?.status).toBe("APPROVED");
      expect(approvedRequest?.reviewedBy).toBe(dccUser.id);
    });

    it("should allow DCC to reject deletion request", async () => {
      // Create expired document
      const oldDate = new Date(Date.now() - 73 * 60 * 60 * 1000);
      const expiredDocument = await prismaService.document.create({
        data: {
          name: "Reject Test Document",
          fileName: "reject-test.pdf",
          fileType: "pdf",
          fileSize: 1024,
          filePath: "test-folder/reject-test.pdf",
          checksum: "test-checksum-reject",
          folderId: testFolder.id,
          levelId: testLevelId,
          uploadedBy: testUser.id,
          uploadedAt: oldDate,
          createdAt: oldDate,
          status: "ACTIVE",
        },
      });
      createdResources.documents.push(expiredDocument.id);

      // Submit deletion request
      const requestResponse = await request(app.getHttpServer())
        .post(`/api/storage/documents/${expiredDocument.id}/deletion-requests`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          reason: "Invalid reason",
        })
        .expect(201);

      const requestId = requestResponse.body.id;
      createdResources.deletionRequests.push(requestId);

      // DCC rejects request
      await request(app.getHttpServer())
        .post(`/api/storage/deletion-requests/${requestId}/review`)
        .set("Authorization", `Bearer ${dccAccessToken}`)
        .send({
          approve: false,
          comment: "Request does not meet requirements",
        })
        .expect(200);

      // Verify document is NOT deleted
      const document = await prismaService.document.findUnique({
        where: { id: expiredDocument.id },
      });
      expect(document?.status).toBe("ACTIVE");

      // Verify request is rejected
      const rejectedRequest = await prismaService.deletionRequest.findUnique({
        where: { id: requestId },
      });
      expect(rejectedRequest?.status).toBe("REJECTED");
      expect(rejectedRequest?.reviewerComment).toBe(
        "Request does not meet requirements"
      );
    });
  });
});
