import { Module } from '@nestjs/common';
import { LedgersService } from './ledgers.service';

@Module({
  providers: [LedgersService],
  exports: [LedgersService],
})
export class LedgersModule {}
