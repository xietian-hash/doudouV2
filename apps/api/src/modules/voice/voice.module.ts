import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { LlmService } from './llm.service';
import { AsrService } from './asr.service';
import { CategoriesModule } from '../categories/categories.module';
import { LedgersModule } from '../ledgers/ledgers.module';

@Module({
  imports: [CategoriesModule, LedgersModule],
  controllers: [VoiceController],
  providers: [VoiceService, LlmService, AsrService],
  exports: [VoiceService, LlmService, AsrService],
})
export class VoiceModule {}
