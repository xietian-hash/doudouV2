import { Module } from '@nestjs/common';
import { RecurringBillsController } from './recurring-bills.controller';
import { RecurringBillsService } from './recurring-bills.service';
import { RecurringBillsRepo } from './recurring-bills.repo';
import { CategoriesModule } from '../categories/categories.module';
import { AccountsModule } from '../accounts/accounts.module';
import { LedgersModule } from '../ledgers/ledgers.module';

@Module({
  imports: [CategoriesModule, AccountsModule, LedgersModule],
  controllers: [RecurringBillsController],
  providers: [RecurringBillsService, RecurringBillsRepo],
  exports: [RecurringBillsService, RecurringBillsRepo],
})
export class RecurringBillsModule {}
