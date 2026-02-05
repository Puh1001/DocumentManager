import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { DocumentLevelService } from "../services/document-level.service";

@ApiTags("Document Levels")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("storage/document-levels")
export class DocumentLevelController {
  constructor(private readonly documentLevelService: DocumentLevelService) {}

  @Get()
  @ApiOperation({ summary: "List document levels (for upload level selector)" })
  async findAll(@Query("isActive") isActive?: string) {
    const activeOnly = isActive !== "false";
    return this.documentLevelService.findAll(activeOnly);
  }
}
