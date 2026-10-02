import { IsEnum, IsOptional, ValidateBy } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { isValidApiDate } from '../common/dates';
import { Sentiment } from './sentiment.enum';

export class MentionsQueryDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD or ISO timestamp)', example: '2024-01-01' })
  @IsOptional()
  @ValidateBy({
    name: 'apiDate',
    validator: {
      validate: isValidApiDate,
      defaultMessage: () => 'from must be a valid YYYY-MM-DD or ISO timestamp with timezone',
    },
  })
  from?: string;
  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD or ISO timestamp)', example: '2024-12-31' })
  @IsOptional()
  @ValidateBy({
    name: 'apiDate',
    validator: {
      validate: isValidApiDate,
      defaultMessage: () => 'to must be a valid YYYY-MM-DD or ISO timestamp with timezone',
    },
  })
  to?: string;
  @ApiPropertyOptional({ description: 'Filter by sentiment', enum: Sentiment })
  @IsOptional()
  @IsEnum(Sentiment)
  sentiment?: Sentiment;
}
