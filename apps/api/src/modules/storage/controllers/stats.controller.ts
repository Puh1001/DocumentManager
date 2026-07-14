import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { StatsService, StatsResponse, DepartmentStatsResponse } from "../services/stats.service";
import { AuthenticatedRequest } from "@/common/types/request.types";

@ApiTags("Stats")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("storage/stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: "Get dashboard statistics" })
  async getStats(): Promise<StatsResponse> {
    return this.statsService.getStats();
  }

  @Get("departments")
  @ApiOperation({ summary: "Get ISO document counts per department (split by level)" })
  async getDepartmentStats(
    @Req() req: AuthenticatedRequest,
  ): Promise<DepartmentStatsResponse> {
    return this.statsService.getDepartmentStats(req.user.id, req.user.roles);
  }
}
