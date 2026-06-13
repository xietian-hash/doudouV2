import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportTemplateService } from './import.template';
import { ImportParserService } from './import.parser';
import { CategoriesModule } from '../categories/categories.module';
import { AccountsModule } from '../accounts/accounts.module';
import { TagsModule } from '../tags/tags.module';
import { BillsModule } from '../bills/bills.module';
import { LedgersModule } from '../ledgers/ledgers.module';

@Module({
  imports: [CategoriesModule, AccountsModule, TagsModule, BillsModule, LedgersModule],
  controllers: [ImportController],
  providers: [ImportService, ImportTemplateService, ImportParserService],
})
export class ImportModule {}
