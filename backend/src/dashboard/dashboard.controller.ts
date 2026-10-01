import { Controller, Get, Query } from '@nestjs/common';
import { DashboardQueryDto } from './dashboard-query.dto';
import { DashboardResponse } from './dashboard-response.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  getDashboard(@Query() query: DashboardQueryDto): Promise<DashboardResponse> {
    return this.dashboard.getDashboard(query.quarter);
  }
}
