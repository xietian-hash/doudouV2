import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { TagsRepo } from './tags.repo';

@Module({
  controllers: [TagsController],
  providers: [TagsService, TagsRepo],
  exports: [TagsService, TagsRepo],
})
export class TagsModule {}
