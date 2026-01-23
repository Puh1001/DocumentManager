import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewDeletionRequestDto {
  @ApiProperty({
    description: 'Whether to approve or reject the deletion request',
    example: true,
  })
  @IsBoolean()
  approve: boolean;

  @ApiPropertyOptional({
    description: 'Optional comment from DCC reviewer',
    example: 'Approved - document is outdated and replacement provided',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
