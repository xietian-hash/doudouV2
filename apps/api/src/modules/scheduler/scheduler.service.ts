import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { RecurringBillsRepo } from '../recurring-bills/recurring-bills.repo';
import { shouldGenerateOnDate } from '../recurring-bills/recurring-bills.service';

const MAX_LOOKBACK_DAYS = 90;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly recurringBillsRepo: RecurringBillsRepo) {}

  @Cron('5 0 * * *', { timeZone: 'Asia/Shanghai' })
  async generateRecurringBills() {
    this.logger.log('开始执行重复账单生成任务');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);

    const allActive = await this.recurringBillsRepo.findAllActiveForScheduler();
    this.logger.log(`共找到 ${allActive.length} 条活跃重复账单`);

    let totalGenerated = 0;
    let totalSkipped = 0;

    for (const rb of allActive) {
      try {
        const generated = await this.processRecurringBill(rb, today, cutoff);
        totalGenerated += generated;
      } catch (err: unknown) {
        this.logger.error(`处理重复账单 ${rb.id} 时出错: ${(err as Error).message}`);
        totalSkipped++;
      }
    }

    this.logger.log(`任务完成，生成 ${totalGenerated} 条账单，跳过 ${totalSkipped} 条异常`);
  }

  private async processRecurringBill(
    rb: Awaited<ReturnType<RecurringBillsRepo['findAllActiveForScheduler']>>[number],
    today: Date,
    cutoff: Date,
  ): Promise<number> {
    let from: Date;
    if (rb.lastGeneratedDate) {
      from = new Date(rb.lastGeneratedDate);
      from.setDate(from.getDate() + 1);
    } else {
      from = new Date(rb.startDate);
    }
    from.setHours(0, 0, 0, 0);

    // 不超过最大回溯天数
    if (from < cutoff) {
      from = new Date(cutoff);
    }

    const endDate = rb.endDate ? new Date(rb.endDate) : null;
    if (endDate) endDate.setHours(0, 0, 0, 0);

    let generated = 0;
    let lastDate: Date | null = null;

    const prisma = this.recurringBillsRepo.getClient();

    const d = new Date(from);
    while (d <= today) {
      if (endDate && d > endDate) break;

      if (shouldGenerateOnDate(rb as any, d)) {
        const dateSnap = new Date(d);
        dateSnap.setHours(0, 0, 0, 0);

        const exists = await this.recurringBillsRepo.billExistsForDate(rb.id, dateSnap);
        if (!exists) {
          await prisma.bill.create({
            data: {
              userId: rb.userId,
              ledgerId: rb.ledgerId,
              accountId: rb.accountId,
              categoryId: rb.categoryId,
              type: rb.type,
              amount: rb.amount as Prisma.Decimal,
              remark: rb.remark ?? null,
              billDate: new Date(dateSnap),
              source: 3,
              recurringBillId: rb.id,
            },
          });
          generated++;
        }
        lastDate = dateSnap;
      }

      d.setDate(d.getDate() + 1);
    }

    if (lastDate) {
      await this.recurringBillsRepo.updateLastGeneratedDate(rb.id, lastDate);
    } else if (!rb.lastGeneratedDate && today >= from) {
      // 没有应生成日期，但已处理到今天，记录为今天以避免重复扫描
      // 实际上不更新，保留 null，下次继续从 startDate 扫描
    }

    return generated;
  }
}
