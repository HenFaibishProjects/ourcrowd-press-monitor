import { Matches } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class CompanyIdDto {
  @ApiProperty({ description: 'The ID of the company', example: '123' })
  @Matches(/^[1-9]\d*$/, { message: 'id must be a positive integer' })
  id!: string;
}

export function companyId(idText: string): number {
  const id = Number(idText);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new BadRequestException('id must be a positive safe integer');
  }
  return id;
}
