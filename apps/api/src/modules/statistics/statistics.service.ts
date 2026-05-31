import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async categoryExpense(userId: bigint, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, (mon ?? 1) - 1, 1);
    const end = new Date(year, mon ?? 1, 1);

    // 用 groupBy 按分类汇总支出
    const grouped = await this.prisma.bill.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        isDeleted: 0,
        type: 1, // 支出
        billDate: { gte: start, lt: end },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    if (grouped.length === 0) {
      return [];
    }

    // 获取分类信息
    const categoryIds = grouped.map((g) => g.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: {
        id: true,
        name: true,
        icon: true,
        parentId: true,
        parent: {
          select: { id: true, name: true, icon: true },
        },
      },
    });

    const catMap = new Map(categories.map((c) => [c.id.toString(), c]));

    // 计算总额
    const total = grouped.reduce((sum, g) => {
      const amount = g._sum.amount ?? new Prisma.Decimal(0);
      return sum.plus(amount);
    }, new Prisma.Decimal(0));

    return grouped.map((g) => {
      const cat = catMap.get(g.categoryId.toString());
      const amount = g._sum.amount ?? new Prisma.Decimal(0);
      const percent = total.isZero()
        ? 0
        : parseFloat(amount.div(total).mul(100).toFixed(2));

      return {
        categoryId: g.categoryId.toString(),
        categoryName: cat?.name ?? '未知',
        categoryIcon: cat?.icon ?? null,
        parentCategoryId: cat?.parentId?.toString() ?? null,
        parentCategoryName: cat?.parent?.name ?? null,
        amount: amount.toString(),
        percent,
      };
    });
  }
}
