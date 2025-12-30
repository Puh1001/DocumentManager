import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { ModuleService } from "../services/module.service";
import { CreateModuleDto } from "../dto/create-module.dto";
import { UpdateModuleDto } from "../dto/update-module.dto";
import { AuthenticatedRequest } from "@/common/types/request.types";

@ApiTags("Modules")
@Controller("modules")
@UseGuards(JwtAuthGuard, PoliciesGuard)
@ApiBearerAuth()
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Get()
  @ApiOperation({ summary: "List all active modules (admin-only)" })
  @CheckPolicies({ action: "manage", subject: "all" })
  findAll() {
    return this.moduleService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get module by ID" })
  @ApiParam({ name: "id", description: "Module ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  findOne(@Param("id") id: string) {
    return this.moduleService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new module (admin-only)" })
  @CheckPolicies({ action: "manage", subject: "all" })
  create(
    @Body() createModuleDto: CreateModuleDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.moduleService.create(createModuleDto, req.user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update module (admin-only)" })
  @ApiParam({ name: "id", description: "Module ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  update(
    @Param("id") id: string,
    @Body() updateModuleDto: UpdateModuleDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.moduleService.update(id, updateModuleDto, req.user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete module (soft delete, admin-only)" })
  @ApiParam({ name: "id", description: "Module ID" })
  @CheckPolicies({ action: "manage", subject: "all" })
  remove(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.moduleService.remove(id, req.user.id);
  }
}
