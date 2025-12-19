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
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { FolderService, FolderTreeNode } from "../services/folder.service";
import { FolderSyncService } from "../services/folder-sync.service";
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
    private readonly localEditService: LocalEditService
  ) {}

  @Get()
  @ApiOperation({ summary: "List folders" })
  async findAll(@Query("parentId") parentId?: string) {
    return this.folderService.findAll(parentId);
  }

  @Get("tree")
  @ApiOperation({ summary: "Get folder tree structure" })
  async getTree(): Promise<FolderTreeNode[]> {
    return this.folderService.getTree();
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
    try {
      await this.folderSyncService.syncWithFileSystem();
      return { message: "Sync completed" };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Sync failed: ${errorMessage}`,
          error: "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
