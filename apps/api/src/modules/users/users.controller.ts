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
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: "Create a new user (admin only)" })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: "List all users" })
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get user by ID" })
  async findOne(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update user" })
  async update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Deactivate user" })
  async remove(@Param("id") id: string) {
    return this.usersService.deactivate(id);
  }

  @Post(":id/roles/:roleId")
  @ApiOperation({ summary: "Assign role to user" })
  async assignRole(
    @Param("id") userId: string,
    @Param("roleId") roleId: string
  ) {
    return this.usersService.assignRole(userId, roleId);
  }

  @Delete(":id/roles/:roleId")
  @ApiOperation({ summary: "Remove role from user" })
  async removeRole(
    @Param("id") userId: string,
    @Param("roleId") roleId: string
  ) {
    return this.usersService.removeRole(userId, roleId);
  }
}
