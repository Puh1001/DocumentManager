import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PoliciesGuard } from "@/modules/authorization/guards/policies.guard";
import { CheckPolicies } from "@/modules/authorization/decorators/check-policies.decorator";
import { MaintenanceService } from "../services/maintenance.service";
import { CreateMaintenanceNoticeDto } from "../dto/create-maintenance-notice.dto";
import { UpdateMaintenanceNoticeDto } from "../dto/update-maintenance-notice.dto";
import { AuthenticatedRequest } from "@/common/types/request.types";

@ApiTags("Maintenance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("maintenance")
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({ summary: "List all maintenance notices" })
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get maintenance notice by ID" })
  findOne(@Param("id") id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Post()
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: "create", subject: "Maintenance" })
  @ApiOperation({ summary: "Create maintenance notice (managers/admins only)" })
  create(@Body() dto: CreateMaintenanceNoticeDto, @Request() req: AuthenticatedRequest) {
    return this.maintenanceService.create(dto, req.user.id);
  }

  @Patch(":id")
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: "edit", subject: "Maintenance" })
  @ApiOperation({ summary: "Update maintenance notice (managers/admins only)" })
  update(@Param("id") id: string, @Body() dto: UpdateMaintenanceNoticeDto) {
    return this.maintenanceService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: "delete", subject: "Maintenance" })
  @ApiOperation({ summary: "Delete maintenance notice (managers/admins only)" })
  remove(@Param("id") id: string) {
    return this.maintenanceService.remove(id);
  }
}
