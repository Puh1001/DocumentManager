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
}
