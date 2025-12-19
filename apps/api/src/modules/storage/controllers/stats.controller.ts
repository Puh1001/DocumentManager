import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { StatsService, StatsResponse } from "../services/stats.service";

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
}
