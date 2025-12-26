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

@ApiTags("Folders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("storage/folders")
export class FolderController {
  constructor(
    private readonly folderService: FolderService,
    private readonly folderSyncService: FolderSyncService,
    private readonly folderSyncGateway: FolderSyncGateway,
    private readonly localEditService: LocalEditService
  ) {}

  @Get()
  @ApiOperation({ summary: "List folders" })
  async findAll(
    @Query("parentId") parentId?: string,
    @Query("departmentId") departmentId?: string
  ) {
    return this.folderService.findAll(parentId, departmentId);
  }

  @Get("tree")
  @ApiOperation({ summary: "Get folder tree structure" })
  async getTree(
    @Query("departmentId") departmentId?: string
  ): Promise<FolderTreeNode[]> {
    return this.folderService.getTree(departmentId);
  }

  @Get("tree/with-documents")
  @ApiOperation({ summary: "Get folder tree structure with documents" })
  async getTreeWithDocuments(
    @Query("departmentId") departmentId?: string
  ): Promise<FolderTreeNodeWithDocuments[]> {
    return this.folderService.getTreeWithDocuments(departmentId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get folder by ID with contents" })
  async findOne(@Param("id") id: string) {
    return this.folderService.findById(id);
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
