import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PoliciesGuard } from "@/modules/authorization/guards/policies.guard";
import { CheckPolicies } from "@/modules/authorization/decorators/check-policies.decorator";
import { DepartmentService } from "../services/department.service";
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { UpdateDepartmentDto } from "../dto/update-department.dto";

@ApiTags("Departments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller("departments")
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  @ApiOperation({ summary: "List all departments" })
  findAll() {
    return this.departmentService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get department by ID" })
  findOne(@Param("id") id: string) {
    return this.departmentService.findOne(id);
  }

  @Post()
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Create department (admin only)" })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Patch(":id")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Update department (admin only)" })
  update(@Param("id") id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(id, dto);
  }

  @Delete(":id")
  @CheckPolicies({ action: "manage", subject: "all" })
  @ApiOperation({ summary: "Delete department (admin only)" })
  remove(@Param("id") id: string) {
    return this.departmentService.remove(id);
  }
}
