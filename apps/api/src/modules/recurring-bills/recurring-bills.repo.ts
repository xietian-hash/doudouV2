import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

const RECURRING_BILL_INCLUDE = {
  account: { select: { id: true, name: true } },
  category: {
    select: {
      id: true,
      name: true,
      icon: true,
      parentId: true,
      parent: { select: { id: true, name: true, icon: true } },
    },
  },
} as const;

@Injectable()
export class RecurringBillsRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: bigint, ledgerId: bigint) {
    return this.prisma.recurringBill.findMany({
      where: { userId, ledgerId, isDeleted: 0 },
      include: RECURRING_BILL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: bigint) {
    return this.prisma.recurringBill.findFirst({
      where: { id, isDeleted: 0 },
      include: RECURRING_BILL_INCLUDE,
    });
  }

  async create(data: Prisma.RecurringBillUncheckedCreateInput) {
    return this.prisma.recurringBill.create({
      data,
      include: RECURRING_BILL_INCLUDE,
    });
  }

  async update(id: bigint, data: Prisma.RecurringBillUncheckedUpdateInput) {
    return this.prisma.recurringBill.update({
      where: { id },
      data,
      include: RECURRING_BILL_INCLUDE,
    });
  }

  async softDelete(id: bigint) {
    return this.prisma.recurringBill.update({
      where: { id },
      data: { isDeleted: 1 },
    });
  }

  async toggle(id: bigint, isActive: number) {
    return this.prisma.recurringBill.update({
      where: { id },
      data: { isActive },
    });
  }

  /** 查询所有需要今日执行的活跃重复账单（供定时任务使用） */
  async findAllActiveForScheduler() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.recurringBill.findMany({
      where: {
        isActive: 1,
        isDeleted: 0,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      include: RECURRING_BILL_INCLUDE,
    });
  }

  async updateLastGeneratedDate(id: bigint, date: Date) {
    return this.prisma.recurringBill.update({
      where: { id },
      data: { lastGeneratedDate: date },
    });
  }

  /** 检查同一重复账单在指定日期是否已存在账单（防重复兜底） */
  async billExistsForDate(recurringBillId: bigint, date: Date): Promise<boolean> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const count = await this.prisma.bill.count({
      where: {
        recurringBillId,
        billDate: { gte: start, lte: end },
        isDeleted: 0,
      },
    });
    return count > 0;
  }

  getClient() {
    return this.prisma;
  }
}
