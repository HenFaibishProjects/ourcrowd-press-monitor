import { Controller, Get, Param, Query } from '@nestjs/common';
import { CompanyIdDto, companyId } from '../common/company-id.dto';
import { Mention } from './mention.entity';
import { MentionsQueryDto } from './mentions-query.dto';
import { MentionsService } from './mentions.service';

@Controller('companies/:id/mentions')
export class MentionsController {
  constructor(private readonly mentions: MentionsService) {}

  @Get()
  findByCompany(@Param() params: CompanyIdDto, @Query() query: MentionsQueryDto): Promise<Mention[]> {
    return this.mentions.findByCompany(companyId(params.id), query);
  }
}
