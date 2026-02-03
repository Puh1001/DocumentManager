import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import {
  FolderService,
  FolderTreeNode,
  FolderTreeNodeWithDocuments,
} from "../services/folder.service";
import { FolderSyncService } from "../services/folder-sync.service";
import { FolderSyncGateway } from "../gateways/folder-sync.gateway";
import {
  LocalEditService,
  OpenPathResponse,
} from "../services/local-edit.service";
import { CreateFolderDto } from "../dto/create-folder.dto";
import { UpdateFolderDto } from "../dto/update-folder.dto";
import { AuthenticatedRequest } from "@/common/types/request.types";
import { UsersService } from "@/modules/users/users.service";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

@ApiTags("Folders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("storage/folders")
export class FolderController {
  constructor(
    private readonly folderService: FolderService,
    private readonly folderSyncService: FolderSyncService,
    private readonly folderSyncGateway: FolderSyncGateway,
    private readonly localEditService: LocalEditService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Ensures the user can access the given department (user's departments or admin/dcc/boss).
   * Throws 403 if not allowed.
   */
  private async ensureDepartmentAccess(
    departmentId: string,
    req: AuthenticatedRequest,
  ): Promise<void> {
    const roles = req.user?.roles ?? [];
    const canSeeAll = roles.some((r) =>
      ["admin", "dcc", "boss"].includes(r),
    );
    if (canSeeAll) return;
    let userDepartmentIds: string[];
    try {
      const depts = await this.usersService.getUserDepartments(req.user!.id);
      userDepartmentIds = depts.map((d) => d.id);
    } catch {
      userDepartmentIds = [];
    }
    if (!userDepartmentIds.includes(departmentId)) {
      throw CustomException.forbidden(
        ErrorCodes.FOLDER.ACCESS_DENIED,
        "Department not accessible",
      );
    }
  }

  @Get()
  @ApiOperation({ summary: "List folders" })
  async findAll(
    @Query("parentId") parentId?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    return this.folderService.findAll(parentId, departmentId);
  }

  @Get("tree")
  @ApiOperation({ summary: "Get folder tree structure" })
  async getTree(
    @Query("departmentId") departmentId?: string,
    @Request() req?: AuthenticatedRequest,
  ): Promise<FolderTreeNode[]> {
    if (departmentId && req?.user) {
      await this.ensureDepartmentAccess(departmentId, req);
    }
    const roles = req?.user?.roles || [];
    const includeInternal = roles.includes("admin") || roles.includes("dcc");
    return this.folderService.getTree(departmentId, includeInternal);
  }

  @Get("tree/with-documents")
  @ApiOperation({ summary: "Get folder tree structure with documents" })
  async getTreeWithDocuments(
    @Query("departmentId") departmentId?: string,
    @Request() req?: AuthenticatedRequest,
  ): Promise<FolderTreeNodeWithDocuments[]> {
    if (departmentId && req?.user) {
      await this.ensureDepartmentAccess(departmentId, req);
    }
    const roles = req?.user?.roles || [];
    const includeInternal = roles.includes("admin") || roles.includes("dcc");
    return this.folderService.getTreeWithDocuments(
      departmentId,
      includeInternal,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get folder by ID with contents" })
  async findOne(
    @Param("id") id: string,
    @Query("status") status?: string,
  ) {
    return this.folderService.findById(id, status);
  }

  @Post()
  @ApiOperation({ summary: "Create a new folder" })
  async create(@Body() dto: CreateFolderDto) {
    return this.folderService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update folder" })
  async update(@Param("id") id: string, @Body() dto: UpdateFolderDto) {
    return this.folderService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete folder" })
  async remove(@Param("id") id: string) {
    return this.folderService.delete(id);
  }

  @Get(":id/open-path")
  @ApiOperation({ summary: "Get path to open folder in Windows Explorer" })
  async getOpenPath(@Param("id") id: string): Promise<OpenPathResponse> {
    const folder = await this.folderService.findById(id);
    return this.localEditService.getOpenFolderPath(folder.path);
  }

  @Post("sync")
  @ApiOperation({ summary: "Sync folders with file system" })
  async sync() {
    // Return immediately and run sync in background
    // Frontend will listen to WebSocket events for completion
    this.folderSyncService
      .syncWithFileSystem()
      .then(() => {
        // Emit success event via WebSocket
        this.folderSyncGateway.broadcastSyncEvent({
          type: "sync_completed",
          data: { success: true },
        });
      })
      .catch((error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        // Emit error event via WebSocket
        this.folderSyncGateway.broadcastSyncEvent({
          type: "sync_completed",
          data: { success: false, error: errorMessage },
        });
      });

    // Return immediately - don't wait for sync to complete
    return { message: "Sync started", status: "processing" };
  }
}
