import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PoliciesGuard } from "./policies.guard";
import { CaslAbilityFactory } from "../factories/casl-ability.factory";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PolicyHandler } from "../decorators/check-policies.decorator";
import { AuthenticatedRequest } from "@/common/types/request.types";
import { AppAbility, Document, Folder } from "../types/ability.types";

describe("PoliciesGuard", () => {
  let guard: PoliciesGuard;

  const mockAbility: Partial<AppAbility> = {
    can: jest.fn(),
  };

  const mockCaslAbilityFactory = {
    createForUser: jest.fn(),
  };

  const mockPrismaService = {
    folder: {
      findUnique: jest.fn(),
    },
    document: {
      findUnique: jest.fn(),
    },
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesGuard,
        {
          provide: CaslAbilityFactory,
          useValue: mockCaslAbilityFactory,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<PoliciesGuard>(PoliciesGuard);

    jest.clearAllMocks();
    mockCaslAbilityFactory.createForUser.mockResolvedValue(mockAbility);
  });

  const createMockContext = (
    handlers: PolicyHandler[] | undefined,
    user: { id: string; roles: string[] } | null = {
      id: "user-1",
      roles: ["viewer"],
    },
    params: Record<string, string> = {},
    body: Record<string, unknown> = {},
    query: Record<string, string> = {}
  ): ExecutionContext => {
    const request = {
      user,
      params,
      body,
      query,
    } as AuthenticatedRequest;

    mockReflector.getAllAndOverride.mockReturnValue(handlers);

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe("canActivate", () => {
    it("should allow access when no policy handlers are defined", async () => {
      const context = createMockContext(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockCaslAbilityFactory.createForUser).not.toHaveBeenCalled();
    });

    it("should allow access when policy handlers array is empty", async () => {
      const context = createMockContext([]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockCaslAbilityFactory.createForUser).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException when user is not authenticated", async () => {
      const handlers: PolicyHandler[] = [
        { action: "view", subject: "Document" },
      ];
      const context = createMockContext(handlers, null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException
      );
    });

    it("should check permissions when handlers are defined", async () => {
      const handlers: PolicyHandler[] = [
        { action: "view", subject: "Document" },
      ];
      const context = createMockContext(
        handlers,
        { id: "user-1", roles: ["viewer"] },
        { id: "doc-1" }
      );

      mockPrismaService.document.findUnique.mockResolvedValue({
        id: "doc-1",
        folderId: "folder-1",
      });

      (mockAbility.can as jest.Mock).mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockCaslAbilityFactory.createForUser).toHaveBeenCalledWith(
        "user-1",
        ["viewer"]
      );
    });

    it("should deny access when permission check fails", async () => {
      const handlers: PolicyHandler[] = [
        { action: "delete", subject: "Document" },
      ];
      const context = createMockContext(
        handlers,
        { id: "user-1", roles: ["viewer"] },
        { id: "doc-1" }
      );

      mockPrismaService.document.findUnique.mockResolvedValue({
        id: "doc-1",
        folderId: "folder-1",
      });

      (mockAbility.can as jest.Mock).mockReturnValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should require all handlers to pass", async () => {
      const handlers: PolicyHandler[] = [
        { action: "view", subject: "Document" },
        { action: "download", subject: "Document" },
      ];
      const context = createMockContext(
        handlers,
        { id: "user-1", roles: ["viewer"] },
        { id: "doc-1" }
      );

      mockPrismaService.document.findUnique.mockResolvedValue({
        id: "doc-1",
        folderId: "folder-1",
      });

      (mockAbility.can as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe("execPolicyHandler", () => {
    it('should check "all" subject directly', async () => {
      const handlers: PolicyHandler[] = [{ action: "manage", subject: "all" }];
      const context = createMockContext(handlers);

      (mockAbility.can as jest.Mock).mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAbility.can).toHaveBeenCalledWith("manage", "all");
    });

    it("should check document permissions with resource ID", async () => {
      const handlers: PolicyHandler[] = [
        { action: "view", subject: "Document" },
      ];
      const context = createMockContext(
        handlers,
        { id: "user-1", roles: ["viewer"] },
        { id: "doc-1" }
      );

      mockPrismaService.document.findUnique.mockResolvedValue({
        id: "doc-1",
        folderId: "folder-1",
      });

      const documentSubject: Document = {
        id: "doc-1",
        folderId: "folder-1",
      };

      (mockAbility.can as jest.Mock).mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.document.findUnique).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        select: { id: true, folderId: true },
      });
      expect(mockAbility.can).toHaveBeenCalledWith("view", documentSubject);
    });

    it("should check folder permissions with resource ID", async () => {
      const handlers: PolicyHandler[] = [{ action: "view", subject: "Folder" }];
      const context = createMockContext(
        handlers,
        { id: "user-1", roles: ["viewer"] },
        { id: "folder-1" }
      );

      mockPrismaService.folder.findUnique.mockResolvedValue({
        id: "folder-1",
      });

      const folderSubject: Folder = { id: "folder-1" };

      (mockAbility.can as jest.Mock).mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.folder.findUnique).toHaveBeenCalledWith({
        where: { id: "folder-1" },
        select: { id: true },
      });
      expect(mockAbility.can).toHaveBeenCalledWith("view", folderSubject);
    });

    it("should check document create permission with folderId in body", async () => {
      const handlers: PolicyHandler[] = [
        { action: "create", subject: "Document" },
      ];
      const context = createMockContext(
        handlers,
        { id: "user-1", roles: ["editor"] },
        {},
        { folderId: "folder-1" }
      );

      mockPrismaService.folder.findUnique.mockResolvedValue({
        id: "folder-1",
      });

      const documentSubject: Document = {
        id: "",
        folderId: "folder-1",
      };

      (mockAbility.can as jest.Mock).mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAbility.can).toHaveBeenCalledWith("create", documentSubject);
    });

    it("should check document create permission with folderId in query", async () => {
      const handlers: PolicyHandler[] = [
        { action: "create", subject: "Document" },
      ];
      const context = createMockContext(
        handlers,
        { id: "user-1", roles: ["editor"] },
        {},
        {},
        { folderId: "folder-1" }
      );

      mockPrismaService.folder.findUnique.mockResolvedValue({
        id: "folder-1",
      });

      (mockAbility.can as jest.Mock).mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should deny access when document not found", async () => {
      const handlers: PolicyHandler[] = [
        { action: "view", subject: "Document" },
      ];
      const context = createMockContext(
        handlers,
        { id: "user-1", roles: ["viewer"] },
        { id: "doc-1" }
      );

      mockPrismaService.document.findUnique.mockResolvedValue(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should deny access when folder not found", async () => {
      const handlers: PolicyHandler[] = [{ action: "view", subject: "Folder" }];
      const context = createMockContext(
        handlers,
        { id: "user-1", roles: ["viewer"] },
        { id: "folder-1" }
      );

      mockPrismaService.folder.findUnique.mockResolvedValue(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should check folder create permission without resource ID", async () => {
      const handlers: PolicyHandler[] = [
        { action: "create", subject: "Folder" },
      ];
      const context = createMockContext(handlers, {
        id: "user-1",
        roles: ["editor"],
      });

      (mockAbility.can as jest.Mock).mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAbility.can).toHaveBeenCalledWith("create", "Folder");
    });

    it("should deny access when no resource ID and no folderId for document create", async () => {
      const handlers: PolicyHandler[] = [
        { action: "create", subject: "Document" },
      ];
      const context = createMockContext(handlers, {
        id: "user-1",
        roles: ["editor"],
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });
  });
});
