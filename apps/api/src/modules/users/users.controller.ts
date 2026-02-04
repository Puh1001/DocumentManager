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
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PoliciesGuard } from "../authorization/guards/policies.guard";
import { CheckPolicies } from "../authorization/decorators/check-policies.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";
import { AssignDepartmentsDto } from "./dto/assign-departments.dto";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Create a new user (admin only)" })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "List all users (admin only)" })
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get("for-assignees")
  @CheckPolicies({ action: "edit", subject: "Document" })
  @ApiOperation({
    summary:
      "List users for reviewer/approver assignees (anyone who can edit documents). Returns all users; frontend may filter by isActive.",
  })
  async findForAssignees(@Query() query: QueryUsersDto) {
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 100));
    return this.usersService.findAll({
      page: 1,
      limit,
      // Do not filter by isActive so we always return users when any exist (avoids empty list when isActive parsing or DB state differs)
    });
  }

  @Get(":id")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Get user by ID (admin only)" })
  async findOne(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Patch(":id")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Update user (admin only)" })
  async update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Deactivate user (admin only)" })
  async remove(@Param("id") id: string) {
    return this.usersService.deactivate(id);
  }

  @Delete(":id/hard")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Permanently delete user (admin only)" })
  async hardDelete(@Param("id") id: string) {
    return this.usersService.hardDelete(id);
  }

  @Post(":id/reactivate")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Reactivate user (admin only)" })
  async reactivate(@Param("id") id: string) {
    return this.usersService.reactivate(id);
  }

  @Post(":id/roles/:roleId")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Assign role to user (admin only)" })
  async assignRole(
    @Param("id") userId: string,
    @Param("roleId") roleId: string
  ) {
    return this.usersService.assignRole(userId, roleId);
  }

  @Delete(":id/roles/:roleId")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Remove role from user (admin only)" })
  async removeRole(
    @Param("id") userId: string,
    @Param("roleId") roleId: string
  ) {
    return this.usersService.removeRole(userId, roleId);
  }

  @Get(":id/departments")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Get user's departments (admin only)" })
  async getUserDepartments(@Param("id") userId: string) {
    return this.usersService.getUserDepartments(userId);
  }

  @Post(":id/departments")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Assign departments to user (admin only)" })
  async assignDepartments(
    @Param("id") userId: string,
    @Body() dto: AssignDepartmentsDto
  ) {
    await this.usersService.assignDepartments(userId, dto.departmentIds);
    return { message: "Departments assigned successfully" };
  }

  @Delete(":id/departments/:departmentId")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Remove department from user (admin only)" })
  async removeDepartment(
    @Param("id") userId: string,
    @Param("departmentId") departmentId: string
  ) {
    await this.usersService.removeDepartment(userId, departmentId);
    return { message: "Department removed successfully" };
  }
}
