import { IsEnum, IsOptional, ValidateBy } from 'class-validator';
import { isValidApiDate } from '../common/dates';
import { Sentiment } from './sentiment.enum';

export class MentionsQueryDto {
  @IsOptional()
  @ValidateBy({ name: 'apiDate', validator: { validate: isValidApiDate, defaultMessage: () => 'from must be a valid YYYY-MM-DD or ISO timestamp with timezone' } })
  from?: string;

  @IsOptional()
  @ValidateBy({ name: 'apiDate', validator: { validate: isValidApiDate, defaultMessage: () => 'to must be a valid YYYY-MM-DD or ISO timestamp with timezone' } })
  to?: string;

  @IsOptional()
  @IsEnum(Sentiment)
  sentiment?: Sentiment;
}
