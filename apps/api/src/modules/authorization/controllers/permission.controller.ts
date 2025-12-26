import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PoliciesGuard } from "../guards/policies.guard";
import { CheckPolicies } from "../decorators/check-policies.decorator";
import { PermissionService } from "../services/permission.service";
import { AssignRolePermissionsDto } from "../dto/assign-role-permissions.dto";
import { SetFolderPermissionsDto } from "../dto/set-folder-permissions.dto";
import { SetDocumentPermissionsDto } from "../dto/set-document-permissions.dto";
import { CreatePermissionDto } from "../dto/create-permission.dto";
import { UpdatePermissionDto } from "../dto/update-permission.dto";
import { AuthenticatedRequest } from "@/common/types/request.types";

@ApiTags("Permissions")
@Controller("permissions")
@UseGuards(JwtAuthGuard, PoliciesGuard)
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ summary: "List all permissions" })
  @CheckPolicies({ action: "manage", subject: "all" })
  findAllPermissions() {
    return this.permissionService.findAllPermissions();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get permission by ID" })
  @ApiParam({ name: "id", description: "Permission ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  findOne(@Param("id") id: string) {
    return this.permissionService.findPermissionById(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new permission (admin-only)" })
  @CheckPolicies({ action: "manage", subject: "all" })
  create(
    @Body() createPermissionDto: CreatePermissionDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.permissionService.create(createPermissionDto, req.user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update permission (admin-only)" })
  @ApiParam({ name: "id", description: "Permission ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  update(
    @Param("id") id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.permissionService.update(id, updatePermissionDto, req.user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete permission if not in use (admin-only)" })
  @ApiParam({ name: "id", description: "Permission ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  remove(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.permissionService.delete(id, req.user.id);
  }

  @Get("roles/:roleId")
  @ApiOperation({ summary: "Get permissions for a role" })
  @ApiParam({ name: "roleId", description: "Role ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  getRolePermissions(@Param("roleId") roleId: string) {
    return this.permissionService.getRolePermissions(roleId);
  }

  @Post("roles/:roleId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Assign permissions to a role" })
  @ApiParam({ name: "roleId", description: "Role ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  assignPermissionsToRole(
    @Param("roleId") roleId: string,
    @Body() dto: AssignRolePermissionsDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.permissionService.assignPermissionsToRole(
      roleId,
      dto.permissionIds,
      req.user.id
    );
  }

  @Get("folders/:id")
  @ApiOperation({ summary: "Get permissions for a folder" })
  @ApiParam({ name: "id", description: "Folder ID" })
  @CheckPolicies({ action: "manage", subject: "Folder" })
  getFolderPermissions(@Param("id") folderId: string) {
    return this.permissionService.getFolderPermissions(folderId);
  }

  @Post("folders/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set permissions for a folder" })
  @ApiParam({ name: "id", description: "Folder ID" })
  @CheckPolicies({ action: "manage", subject: "Folder" })
  setFolderPermissions(
    @Param("id") folderId: string,
    @Body() dto: SetFolderPermissionsDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.permissionService.setFolderPermissions(
      folderId,
      dto.permissions,
      req.user.id
    );
  }

  @Get("documents/:id")
  @ApiOperation({ summary: "Get permissions for a document" })
  @ApiParam({ name: "id", description: "Document ID" })
  @CheckPolicies({ action: "manage", subject: "Document" })
  getDocumentPermissions(@Param("id") documentId: string) {
    return this.permissionService.getDocumentPermissions(documentId);
  }

  @Post("documents/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set permissions for a document" })
  @ApiParam({ name: "id", description: "Document ID" })
  @CheckPolicies({ action: "manage", subject: "Document" })
  setDocumentPermissions(
    @Param("id") documentId: string,
    @Body() dto: SetDocumentPermissionsDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.permissionService.setDocumentPermissions(
      documentId,
      dto.permissions,
      req.user.id
    );
  }
}
