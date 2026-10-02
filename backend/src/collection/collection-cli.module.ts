import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { environmentModule } from '../config/environment';
import { databaseOptions } from '../database/database.config';
import { CollectionModule } from './collection.module';

@Module({
  imports: [
    environmentModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => databaseOptions(),
    }),
    CollectionModule,
  ],
  exports: [CollectionModule],
})
export class CollectionCliModule {}
