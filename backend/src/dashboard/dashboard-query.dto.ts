import { IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardQueryDto {
  @ApiPropertyOptional({ description: 'The quarter in YYYY-QN format', example: '2024-Q1' })
  @IsOptional()
  @Matches(/^(?!0000)\d{4}-Q[1-4]$/, {
    message: 'quarter must be YYYY-Q1, YYYY-Q2, YYYY-Q3, or YYYY-Q4 (year 0001–9999)',
  })
  quarter?: string;
}
