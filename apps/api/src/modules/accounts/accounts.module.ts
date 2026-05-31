import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountsRepo } from './accounts.repo';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, AccountsRepo],
  exports: [AccountsService, AccountsRepo],
})
export class AccountsModule {}
