import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillsRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: bigint) {
    return this.prisma.bill.findFirst({
      where: { id, isDeleted: 0 },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            parentId: true,
            type: true,
            parent: { select: { id: true, name: true, icon: true } },
          },
        },
        account: { select: { id: true, name: true } },
        billTags: {
          include: {
            tag: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async findAll(
    userId: bigint,
    options: {
      month?: string;
      date?: string;
      pageNo?: number;
      pageSize?: number;
    },
  ) {
    const { month, date, pageNo = 1, pageSize = 20 } = options;
    const where: Prisma.BillWhereInput = { userId, isDeleted: 0 };

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.billDate = { gte: start, lt: end };
    } else if (month) {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(year, (mon ?? 1) - 1, 1);
      const end = new Date(year, mon ?? 1, 1);
      where.billDate = { gte: start, lt: end };
    }

    const skip = (pageNo - 1) * pageSize;

    const [total, bills] = await this.prisma.$transaction([
      this.prisma.bill.count({ where }),
      this.prisma.bill.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ billDate: 'desc' }, { id: 'desc' }],
        include: {
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              parentId: true,
              type: true,
              parent: { select: { id: true, name: true, icon: true } },
            },
          },
          account: { select: { id: true, name: true } },
          billTags: {
            include: {
              tag: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return { total, bills };
  }

  async create(
    prismaClient: Prisma.TransactionClient,
    data: {
      userId: bigint;
      accountId: bigint;
      categoryId: bigint;
      type: number;
      amount: Prisma.Decimal;
      remark?: string;
      billDate: Date;
      source?: number;
      voiceText?: string;
    },
  ) {
    return prismaClient.bill.create({ data });
  }

  async createBillTags(
    prismaClient: Prisma.TransactionClient,
    billId: bigint,
    tagIds: bigint[],
  ) {
    if (tagIds.length === 0) return;
    await prismaClient.billTag.createMany({
      data: tagIds.map((tagId) => ({ billId, tagId })),
    });
  }

  async updateAccount(
    prismaClient: Prisma.TransactionClient,
    accountId: bigint,
    delta: Prisma.Decimal,
  ) {
    await prismaClient.account.update({
      where: { id: accountId },
      data: { balance: { increment: delta } },
    });
  }

  async updateCategoryLastUsedAt(
    prismaClient: Prisma.TransactionClient,
    categoryId: bigint,
  ) {
    await prismaClient.category.update({
      where: { id: categoryId },
      data: { lastUsedAt: new Date() },
    });
  }

  async softDelete(
    prismaClient: Prisma.TransactionClient,
    id: bigint,
  ) {
    return prismaClient.bill.update({
      where: { id },
      data: { isDeleted: 1 },
    });
  }

  async update(
    prismaClient: Prisma.TransactionClient,
    id: bigint,
    data: Partial<{
      accountId: bigint;
      categoryId: bigint;
      type: number;
      amount: Prisma.Decimal;
      remark: string | null;
      billDate: Date;
    }>,
  ) {
    return prismaClient.bill.update({ where: { id }, data });
  }

  async deleteBillTags(
    prismaClient: Prisma.TransactionClient,
    billId: bigint,
  ) {
    await prismaClient.billTag.deleteMany({ where: { billId } });
  }

  async calendarSummary(userId: bigint, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, (mon ?? 1) - 1, 1);
    const end = new Date(year, mon ?? 1, 1);

    // 用 DATE() 按天聚合，兼容 bill_date 存储了精确时间的情况
    const rows = await this.prisma.$queryRaw<
      Array<{ bill_date: Date | string; type: number; amount: string }>
    >`
      SELECT DATE(bill_date) AS bill_date, type, SUM(amount) AS amount
      FROM bills
      WHERE user_id = ${userId}
        AND is_deleted = 0
        AND bill_date >= ${start}
        AND bill_date < ${end}
      GROUP BY DATE(bill_date), type
    `;

    return rows.map((row) => ({
      billDate: new Date(row.bill_date),
      type: Number(row.type),
      _sum: { amount: new Prisma.Decimal(row.amount ?? '0') },
    }));
  }

  get $transaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }

  getClient() {
    return this.prisma;
  }
}
