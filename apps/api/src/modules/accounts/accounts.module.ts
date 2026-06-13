import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountsRepo } from './accounts.repo';
import { LedgersModule } from '../ledgers/ledgers.module';

@Module({
  imports: [LedgersModule],
  controllers: [AccountsController],
  providers: [AccountsService, AccountsRepo],
  exports: [AccountsService, AccountsRepo],
})
export class AccountsModule {}
