import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  StatsBillType,
  StatsCategoryItem,
  StatsCategoryLevel,
  StatsCategoryTrendResult,
  StatsDailySeriesResult,
  StatsOverviewResult,
  StatsPeriod,
  StatsTopBillsResult,
} from './statistics.dto';

interface PeriodRange {
  start: Date | null;
  end: Date | null;
  /** 周期天数；period=all 时为 null */
  days: number | null;
  /** 上一周期 */
  prevStart: Date | null;
  prevEnd: Date | null;
}

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ 公共：周期区间计算（UTC） ============

  private resolvePeriod(
    period: StatsPeriod,
    month?: string,
    year?: string,
  ): PeriodRange {
    if (period === 'month') {
      const [y, m] = (month ?? '').split('-').map(Number);
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m, 1));
      const days = Math.round((end.getTime() - start.getTime()) / 86400000);
      // 上一月
      const prevStart = new Date(Date.UTC(y, m - 2, 1));
      const prevEnd = start;
      return { start, end, days, prevStart, prevEnd };
    }
    if (period === 'year') {
      const y = Number(year);
      const start = new Date(Date.UTC(y, 0, 1));
      const end = new Date(Date.UTC(y + 1, 0, 1));
      const days = Math.round((end.getTime() - start.getTime()) / 86400000);
      const prevStart = new Date(Date.UTC(y - 1, 0, 1));
      const prevEnd = start;
      return { start, end, days, prevStart, prevEnd };
    }
    // all
    return { start: null, end: null, days: null, prevStart: null, prevEnd: null };
  }

  private buildBillWhere(
    userId: bigint,
    type: StatsBillType,
    start: Date | null,
    end: Date | null,
  ): Prisma.BillWhereInput {
    const where: Prisma.BillWhereInput = {
      userId,
      isDeleted: 0,
      type,
    };
    if (start && end) {
      where.billDate = { gte: start, lt: end };
    }
    return where;
  }

  // ============ /overview ============

  async overview(
    userId: bigint,
    period: StatsPeriod,
    type: StatsBillType,
    level: StatsCategoryLevel,
    month?: string,
    year?: string,
  ): Promise<StatsOverviewResult> {
    const range = this.resolvePeriod(period, month, year);

    // 当期所有账单（仅聚合需要的字段）
    const current = await this.prisma.bill.findMany({
      where: this.buildBillWhere(userId, type, range.start, range.end),
      select: { amount: true, categoryId: true },
    });

    // 上一周期（period=all 时跳过）
    const previous =
      period === 'all'
        ? []
        : await this.prisma.bill.findMany({
            where: this.buildBillWhere(userId, type, range.prevStart, range.prevEnd),
            select: { amount: true, categoryId: true },
          });

    // 全量分类（仅查涉及到的 id 及其父级，方便 level=1 聚合）
    const allCategoryIds = Array.from(
      new Set([...current, ...previous].map((b) => b.categoryId.toString())),
    );
    const categories = allCategoryIds.length
      ? await this.prisma.category.findMany({
          where: {
            id: {
              in: allCategoryIds.map((s) => BigInt(s)),
            },
          },
          select: {
            id: true,
            name: true,
            icon: true,
            parentId: true,
            parent: { select: { id: true, name: true, icon: true } },
          },
        })
      : [];
    const catMap = new Map(categories.map((c) => [c.id.toString(), c]));

    // 聚合 key：按 level 决定取叶子 id 还是父 id
    const aggKey = (leafCatId: string): { id: string; name: string; icon: string | null } => {
      const leaf = catMap.get(leafCatId);
      if (!leaf) return { id: leafCatId, name: '未知分类', icon: null };
      if (level === 2 || leaf.parentId == null) {
        return { id: leaf.id.toString(), name: leaf.name, icon: leaf.icon ?? null };
      }
      // level=1：归并到父级
      const parent = leaf.parent;
      if (!parent) return { id: leaf.id.toString(), name: leaf.name, icon: leaf.icon ?? null };
      return { id: parent.id.toString(), name: parent.name, icon: parent.icon ?? null };
    };

    // 聚合当期
    const currentAgg = new Map<
      string,
      { name: string; icon: string | null; amount: Prisma.Decimal; count: number }
    >();
    let totalAmount = new Prisma.Decimal(0);
    for (const b of current) {
      const k = aggKey(b.categoryId.toString());
      const cur = currentAgg.get(k.id) ?? {
        name: k.name,
        icon: k.icon,
        amount: new Prisma.Decimal(0),
        count: 0,
      };
      cur.amount = cur.amount.plus(b.amount);
      cur.count += 1;
      currentAgg.set(k.id, cur);
      totalAmount = totalAmount.plus(b.amount);
    }

    // 聚合上一周期
    const prevAgg = new Map<string, Prisma.Decimal>();
    let prevTotal = new Prisma.Decimal(0);
    for (const b of previous) {
      const k = aggKey(b.categoryId.toString());
      prevAgg.set(k.id, (prevAgg.get(k.id) ?? new Prisma.Decimal(0)).plus(b.amount));
      prevTotal = prevTotal.plus(b.amount);
    }

    // 组装 categories（按金额降序）
    const categoryItems: StatsCategoryItem[] = [...currentAgg.entries()]
      .map(([id, v]) => {
        const percent = totalAmount.isZero()
          ? 0
          : parseFloat(v.amount.div(totalAmount).mul(100).toFixed(2));
        const item: StatsCategoryItem = {
          categoryId: id,
          categoryName: v.name,
          categoryIcon: v.icon,
          amount: v.amount.toFixed(2),
          percent,
          count: v.count,
        };
        if (period !== 'all') {
          const prev = prevAgg.get(id) ?? new Prisma.Decimal(0);
          item.prevAmount = prev.toFixed(2);
          item.changePercent = this.calcChangePercent(v.amount, prev);
        }
        return item;
      })
      .sort((a, b) => Number(b.amount) - Number(a.amount));

    // 汇总
    const summary: StatsOverviewResult['summary'] = {
      total: totalAmount.toFixed(2),
      count: current.length,
    };
    if (range.days) {
      summary.dailyAvg = totalAmount.div(range.days).toFixed(2);
    }
    if (period !== 'all') {
      summary.prevTotal = prevTotal.toFixed(2);
      summary.changePercent = this.calcChangePercent(totalAmount, prevTotal);
    }

    // 关键洞察
    const insights = this.buildInsights({
      period,
      type,
      total: totalAmount,
      prevTotal,
      categories: categoryItems,
    });

    return { summary, categories: categoryItems, insights };
  }

  private calcChangePercent(cur: Prisma.Decimal, prev: Prisma.Decimal): number | null {
    if (prev.isZero()) return null;
    return parseFloat(cur.minus(prev).div(prev).mul(100).toFixed(2));
  }

  private buildInsights(args: {
    period: StatsPeriod;
    type: StatsBillType;
    total: Prisma.Decimal;
    prevTotal: Prisma.Decimal;
    categories: StatsCategoryItem[];
  }): string[] {
    const { period, type, total, prevTotal, categories } = args;
    const insights: string[] = [];
    if (categories.length === 0) return insights;

    const periodLabel = period === 'month' ? '本月' : period === 'year' ? '本年' : '全部时段';
    const prevLabel = period === 'month' ? '上月' : period === 'year' ? '去年' : '';
    const typeLabel = type === 1 ? '支出' : '收入';

    // 洞察 1：本期总额 vs 上期
    if (period !== 'all') {
      const change = this.calcChangePercent(total, prevTotal);
      if (change == null) {
        insights.push(`${periodLabel}${typeLabel} ${total.toFixed(2)} 元`);
      } else {
        const dir = change >= 0 ? '多' : '少';
        insights.push(
          `${periodLabel}${typeLabel} ${total.toFixed(2)} 元，比${prevLabel} ${dir} ${Math.abs(change).toFixed(1)}%`,
        );
      }
    } else {
      insights.push(`${periodLabel}${typeLabel}合计 ${total.toFixed(2)} 元，共 ${categories.reduce((s, c) => s + c.count, 0)} 笔`);
    }

    // 洞察 2：最高分类占比
    const top = categories[0];
    if (top) {
      const changeText =
        period !== 'all' && top.changePercent != null
          ? `，比${prevLabel}${top.changePercent >= 0 ? '多' : '少'} ${Math.abs(top.changePercent).toFixed(1)}%`
          : '';
      insights.push(
        `「${top.categoryName}」是${periodLabel}最大${typeLabel}，占 ${top.percent.toFixed(1)}%${changeText}`,
      );
    }

    return insights;
  }

  // ============ /category-trend ============

  async categoryTrend(
    userId: bigint,
    level: StatsCategoryLevel,
    type: StatsBillType,
  ): Promise<StatsCategoryTrendResult> {
    // 最近 6 个月（含当月）
    const now = new Date();
    const baseY = now.getUTCFullYear();
    const baseM = now.getUTCMonth(); // 0-based
    const months: string[] = [];
    const ranges: Array<{ start: Date; end: Date }> = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(Date.UTC(baseY, baseM - i, 1));
      const end = new Date(Date.UTC(baseY, baseM - i + 1, 1));
      months.push(`${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`);
      ranges.push({ start, end });
    }

    const allStart = ranges[0].start;
    const allEnd = ranges[ranges.length - 1].end;

    const bills = await this.prisma.bill.findMany({
      where: this.buildBillWhere(userId, type, allStart, allEnd),
      select: { amount: true, categoryId: true, billDate: true },
    });

    if (bills.length === 0) {
      return { months, data: [] };
    }

    // 拉一次涉及的 categories
    const ids = Array.from(new Set(bills.map((b) => b.categoryId.toString())));
    const categories = await this.prisma.category.findMany({
      where: { id: { in: ids.map((s) => BigInt(s)) } },
      select: {
        id: true,
        name: true,
        icon: true,
        parentId: true,
        parent: { select: { id: true, name: true, icon: true } },
      },
    });
    const catMap = new Map(categories.map((c) => [c.id.toString(), c]));

    const aggKey = (leafId: string) => {
      const leaf = catMap.get(leafId);
      if (!leaf) return { id: leafId, name: '未知分类', icon: null as string | null };
      if (level === 2 || leaf.parentId == null) {
        return { id: leaf.id.toString(), name: leaf.name, icon: leaf.icon ?? null };
      }
      const parent = leaf.parent;
      if (!parent) return { id: leaf.id.toString(), name: leaf.name, icon: leaf.icon ?? null };
      return { id: parent.id.toString(), name: parent.name, icon: parent.icon ?? null };
    };

    // 月份分桶
    const matrix = new Map<
      string,
      { name: string; icon: string | null; sums: Prisma.Decimal[] }
    >();
    const monthIndexOf = (d: Date): number => {
      const ts = d.getTime();
      for (let i = 0; i < ranges.length; i++) {
        if (ts >= ranges[i].start.getTime() && ts < ranges[i].end.getTime()) return i;
      }
      return -1;
    };

    for (const b of bills) {
      const idx = monthIndexOf(b.billDate);
      if (idx < 0) continue;
      const k = aggKey(b.categoryId.toString());
      let row = matrix.get(k.id);
      if (!row) {
        row = {
          name: k.name,
          icon: k.icon,
          sums: Array.from({ length: 6 }, () => new Prisma.Decimal(0)),
        };
        matrix.set(k.id, row);
      }
      row.sums[idx] = row.sums[idx].plus(b.amount);
    }

    const data = [...matrix.entries()].map(([id, v]) => ({
      categoryId: id,
      categoryName: v.name,
      categoryIcon: v.icon,
      amounts: v.sums.map((d) => d.toFixed(2)),
    }));

    return { months, data };
  }

  // ============ /daily-series ============

  async dailySeries(
    userId: bigint,
    period: StatsPeriod,
    type: StatsBillType,
    month?: string,
    year?: string,
  ): Promise<StatsDailySeriesResult> {
    const range = this.resolvePeriod(period, month, year);

    const bills = await this.prisma.bill.findMany({
      where: this.buildBillWhere(userId, type, range.start, range.end),
      select: { amount: true, billDate: true },
    });

    if (period === 'all') {
      // 按月聚合
      const map = new Map<string, Prisma.Decimal>();
      for (const b of bills) {
        const key = `${b.billDate.getUTCFullYear()}-${String(b.billDate.getUTCMonth() + 1).padStart(2, '0')}`;
        map.set(key, (map.get(key) ?? new Prisma.Decimal(0)).plus(b.amount));
      }
      const points = [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, amt]) => ({ date, amount: amt.toFixed(2) }));
      return { granularity: 'month', points };
    }

    // month / year：按天聚合，未发生天也填 0（仅 month 模式，year 模式仅输出有数据的日）
    const map = new Map<string, Prisma.Decimal>();
    for (const b of bills) {
      const d = b.billDate;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? new Prisma.Decimal(0)).plus(b.amount));
    }

    if (period === 'month' && range.start && range.end) {
      // 月模式补齐每一天
      const points: StatsDailySeriesResult['points'] = [];
      const cur = new Date(range.start.getTime());
      while (cur < range.end) {
        const key = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}-${String(cur.getUTCDate()).padStart(2, '0')}`;
        points.push({ date: key, amount: (map.get(key) ?? new Prisma.Decimal(0)).toFixed(2) });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      return { granularity: 'day', points };
    }

    // year 模式只返有数据的日
    const points = [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amt]) => ({ date, amount: amt.toFixed(2) }));
    return { granularity: 'day', points };
  }

  // ============ /top-bills ============

  async topBills(
    userId: bigint,
    period: StatsPeriod,
    type: StatsBillType,
    limit = 5,
    month?: string,
    year?: string,
  ): Promise<StatsTopBillsResult> {
    const range = this.resolvePeriod(period, month, year);

    const bills = await this.prisma.bill.findMany({
      where: this.buildBillWhere(userId, type, range.start, range.end),
      orderBy: { amount: 'desc' },
      take: limit,
      select: {
        id: true,
        amount: true,
        billDate: true,
        type: true,
        remark: true,
        category: { select: { name: true, icon: true } },
        account: { select: { name: true } },
      },
    });

    return {
      bills: bills.map((b) => ({
        id: b.id.toString(),
        amount: b.amount.toFixed(2),
        billDate: b.billDate.toISOString().slice(0, 10),
        type: b.type,
        categoryName: b.category?.name ?? '未知',
        categoryIcon: b.category?.icon ?? null,
        accountName: b.account?.name ?? '未知',
        remark: b.remark ?? null,
      })),
    };
  }

  // ============ /category-expense（保留兼容） ============

  async categoryExpense(userId: bigint, month: string) {
    const result = await this.overview(userId, 'month', 1, 2, month, undefined);
    // 历史调用方期望的字段：categoryId / categoryName / categoryIcon / parentCategoryId / parentCategoryName / amount / percent
    // 这里 level=2 返回的就是叶子，附带父级信息需要再补一次
    const leafIds = result.categories.map((c) => BigInt(c.categoryId));
    if (leafIds.length === 0) return [];
    const cats = await this.prisma.category.findMany({
      where: { id: { in: leafIds } },
      select: {
        id: true,
        parentId: true,
        parent: { select: { id: true, name: true } },
      },
    });
    const parentMap = new Map(cats.map((c) => [c.id.toString(), c]));
    return result.categories.map((c) => {
      const cat = parentMap.get(c.categoryId);
      return {
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        categoryIcon: c.categoryIcon,
        parentCategoryId: cat?.parentId?.toString() ?? null,
        parentCategoryName: cat?.parent?.name ?? null,
        amount: c.amount,
        percent: c.percent,
      };
    });
  }
}
