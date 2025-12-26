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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PoliciesGuard } from "../guards/policies.guard";
import { CheckPolicies } from "../decorators/check-policies.decorator";
import { RoleService } from "../services/role.service";
import { CreateRoleDto } from "../dto/create-role.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";
import { QueryRolesDto } from "../dto/query-roles.dto";
import { AuthenticatedRequest } from "@/common/types/request.types";

@ApiTags("Roles")
@Controller("roles")
@UseGuards(JwtAuthGuard, PoliciesGuard)
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: "List all roles (admin-only)" })
  @CheckPolicies({ action: "manage", subject: "all" })
  findAll(@Query() query: QueryRolesDto) {
    return this.roleService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get role by ID with permissions" })
  @ApiParam({ name: "id", description: "Role ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  findOne(@Param("id") id: string) {
    return this.roleService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new role (admin-only)" })
  @CheckPolicies({ action: "manage", subject: "all" })
  create(
    @Body() createRoleDto: CreateRoleDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.roleService.create(createRoleDto, req.user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update role (admin-only)" })
  @ApiParam({ name: "id", description: "Role ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  update(
    @Param("id") id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.roleService.update(id, updateRoleDto, req.user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete role if not in use (admin-only)" })
  @ApiParam({ name: "id", description: "Role ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  remove(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.roleService.delete(id, req.user.id);
  }
}
