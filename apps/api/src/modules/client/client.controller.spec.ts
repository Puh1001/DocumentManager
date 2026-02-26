import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";
import { ClientController } from "./client.controller";
import { ClientService } from "./client.service";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PoliciesGuard } from "@/modules/authorization/guards/policies.guard";
import type { ListClientFilesResult } from "./client.service";
import type { ListClientFilesDto } from "./dto/list-client-files.dto";
import type { AuthenticatedRequest } from "@/common/types/request.types";
import type { Readable } from "stream";

describe("ClientController", () => {
  let controller: ClientController;
  let service: jest.Mocked<ClientService>;

  beforeEach(async () => {
    const mockGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientController],
      providers: [
        {
          provide: ClientService,
          useValue: {
            list: jest.fn(),
            upload: jest.fn(),
            delete: jest.fn(),
            getStream: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PoliciesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(ClientController);
    service = module.get(ClientService) as jest.Mocked<ClientService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should proxy to clientService.list with mapped filters", async () => {
      const query: ListClientFilesDto = {
        search: "test",
        fileType: "pdf",
        dateFrom: "2026-02-01",
        dateTo: "2026-02-10",
        page: 2,
        limit: 5,
      };

      const result: ListClientFilesResult = {
        data: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      };

      service.list.mockResolvedValue(result);

      const response = await controller.list(query);

      expect(service.list).toHaveBeenCalledWith({
        search: "test",
        fileType: "pdf",
        dateFrom: "2026-02-01",
        dateTo: "2026-02-10",
        page: 2,
        limit: 5,
      });
      expect(response).toBe(result);
    });
  });

  describe("upload", () => {
    it("should call clientService.upload with file and user id", async () => {
      const file = {
        buffer: Buffer.from("test"),
        originalname: "test.pdf",
        size: 1024,
      } as Express.Multer.File;

      const req: AuthenticatedRequest = {
        user: { id: "user-1", username: "user-1", roles: [] },
      } as unknown as AuthenticatedRequest;

      const expected = {
        id: "doc-1",
        name: "File 1",
        fileName: "file1.pdf",
        fileType: "pdf",
      };

      service.upload.mockResolvedValue(expected);

      const result = await controller.upload(file, req);

      expect(service.upload).toHaveBeenCalledWith(file, "user-1");
      expect(result).toBe(expected);
    });
  });

  describe("delete", () => {
    it("should call clientService.delete with id and user id and return message", async () => {
      const req: AuthenticatedRequest = {
        user: { id: "user-1", username: "user-1", roles: [] },
      } as unknown as AuthenticatedRequest;

      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete("doc-1", req);

      expect(service.delete).toHaveBeenCalledWith("doc-1", "user-1");
      expect(result).toEqual({ message: "Deleted" });
    });
  });

  describe("stream", () => {
    it("should call clientService.getStream and pipe to response", async () => {
      const mockStream = { pipe: jest.fn() } as unknown as Readable;

      service.getStream.mockResolvedValue({
        stream: mockStream,
        fileType: "pdf",
      });

      const headers: Record<string, string> = {};
      const res = {
        setHeader: (key: string, value: string) => {
          headers[key] = value;
        },
      } as unknown as Response;

      await controller.stream("doc-1", res);

      expect(service.getStream).toHaveBeenCalledWith("doc-1");
      expect(headers["Content-Type"]).toBe("application/pdf");
      expect(headers["Content-Disposition"]).toBe("inline");
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });
  });
});

