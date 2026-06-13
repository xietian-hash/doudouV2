import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriesRepo } from './categories.repo';
import { LlmService } from '../voice/llm.service';
import { LedgersModule } from '../ledgers/ledgers.module';

@Module({
  imports: [LedgersModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepo, LlmService],
  exports: [CategoriesService, CategoriesRepo],
})
export class CategoriesModule {}
