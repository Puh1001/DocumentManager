import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitKpiDeletionRequestDto {
  @ApiProperty({
    description: 'Reason for requesting deletion of KPI attachment',
    example: 'Attachment contains outdated information and needs to be replaced',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'Reason must be at least 10 characters' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Optional ID of replacement document',
    example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
  })
  @IsOptional()
  @IsUUID()
  replacementFileId?: string;
}
