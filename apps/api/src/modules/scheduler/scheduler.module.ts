import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { RecurringBillsModule } from '../recurring-bills/recurring-bills.module';

@Module({
  imports: [RecurringBillsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
