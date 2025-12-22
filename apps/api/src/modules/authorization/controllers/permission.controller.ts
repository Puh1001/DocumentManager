import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
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

  @Get("roles/:id")
  @ApiOperation({ summary: "Get permissions for a role" })
  @ApiParam({ name: "id", description: "Role ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  getRolePermissions(@Param("id") roleId: string) {
    return this.permissionService.getRolePermissions(roleId);
  }

  @Post("roles/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Assign permissions to a role" })
  @ApiParam({ name: "id", description: "Role ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  assignPermissionsToRole(
    @Param("id") roleId: string,
    @Body() dto: AssignRolePermissionsDto
  ) {
    return this.permissionService.assignPermissionsToRole(
      roleId,
      dto.permissionIds
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
    @Body() dto: SetFolderPermissionsDto
  ) {
    return this.permissionService.setFolderPermissions(
      folderId,
      dto.permissions
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
    @Body() dto: SetDocumentPermissionsDto
  ) {
    return this.permissionService.setDocumentPermissions(
      documentId,
      dto.permissions
    );
  }
}
