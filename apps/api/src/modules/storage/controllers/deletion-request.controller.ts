import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { DocumentDeletionService } from '../services/document-deletion.service';
import { ReviewDeletionRequestDto } from '../dto/review-deletion-request.dto';
import { UsersService } from '@/modules/users/users.service';
import { AuthenticatedRequest } from '@/common/types/request.types';

@ApiTags('Deletion Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage/deletion-requests')
export class DeletionRequestController {
  constructor(
    private readonly deletionService: DocumentDeletionService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List pending deletion requests (DCC only)' })
  async listPending(@Request() req: AuthenticatedRequest) {
    // Verify DCC role at controller level (defense in depth)
    // Note: UsersService.findById() already transforms roles to Array<{ name: string }>
    const user = await this.usersService.findById(req.user.id);
    const userWithRelations = user as unknown as {
      roles?: Array<{ name: string }>;
    };
    const isDCC =
      userWithRelations.roles?.some((role) => role.name === 'dcc') || false;
    const isAdmin =
      userWithRelations.roles?.some((role) => role.name === 'admin') || false;
    
    // Allow both DCC and admin roles
    if (!isDCC && !isAdmin) {
      throw new ForbiddenException(
        'Only DCC members or admins can view deletion requests',
      );
    }
    return this.deletionService.listPendingRequests();
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get current user\'s deletion requests' })
  async getMyRequests(@Request() req: AuthenticatedRequest) {
    return this.deletionService.getUserRequests(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deletion request details' })
  async getRequest(@Param('id') id: string) {
    return this.deletionService.getRequestById(id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Review deletion request (DCC only)' })
  async reviewRequest(
    @Param('id') id: string,
    @Body() dto: ReviewDeletionRequestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.deletionService.reviewRequest(
      id,
      req.user.id,
      dto.approve,
      dto.comment,
    );
  }
}
