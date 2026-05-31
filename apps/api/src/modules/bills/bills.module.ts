import { Module } from '@nestjs/common';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { BillsRepo } from './bills.repo';
import { CategoriesModule } from '../categories/categories.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [CategoriesModule, AccountsModule],
  controllers: [BillsController],
  providers: [BillsService, BillsRepo],
  exports: [BillsService, BillsRepo],
})
export class BillsModule {}
