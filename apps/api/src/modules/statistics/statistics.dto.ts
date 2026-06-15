import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export type StatsPeriod = 'month' | 'year' | 'all';
export type StatsCategoryLevel = 1 | 2;
export type StatsBillType = 1 | 2; // 1=支出 2=收入

/** 公共：时间周期 + 收支 */
class BaseStatsQuery {
  @IsIn(['month', 'year', 'all'], { message: 'period 必须是 month | year | all' })
  period!: StatsPeriod;

  @ValidateIf((o) => o.period === 'month')
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month 格式必须为 YYYY-MM' })
  month?: string;

  @ValidateIf((o) => o.period === 'year')
  @IsString()
  @Matches(/^\d{4}$/, { message: 'year 格式必须为 YYYY' })
  year?: string;

  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2], { message: 'type 必须是 1（支出）或 2（收入）' })
  type!: StatsBillType;
}

/** /overview 查询 */
export class StatsOverviewDto extends BaseStatsQuery {
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2], { message: 'level 必须是 1（一级）或 2（二级）' })
  level!: StatsCategoryLevel;
}

/** /category-trend 查询：固定回最近 6 个月，不带时间字段 */
export class StatsCategoryTrendDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2], { message: 'level 必须是 1（一级）或 2（二级）' })
  level!: StatsCategoryLevel;

  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2], { message: 'type 必须是 1（支出）或 2（收入）' })
  type!: StatsBillType;
}

/** /daily-series 查询 */
export class StatsDailySeriesDto extends BaseStatsQuery {}

/** /top-bills 查询 */
export class StatsTopBillsDto extends BaseStatsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

// ===== 响应类型（仅作 service 内部用，前端按 JSON 消费） =====

export interface StatsSummary {
  total: string;
  count: number;
  dailyAvg?: string;
  dailyAvgChangePercent?: number | null;
  monthlyAvg?: string;
  monthlyAvgChangePercent?: number | null;
  prevTotal?: string;
  changePercent?: number | null;
  yearOverYear?: StatsComparison;
  periodOverPeriod?: StatsComparison;
}

export interface StatsComparison {
  label: '同比' | '环比';
  amount: string;
  changePercent: number | null;
}

export interface StatsCategoryItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  amount: string;
  percent: number;
  count: number;
  prevAmount?: string;
  changePercent?: number | null;
}

export interface StatsOverviewResult {
  summary: StatsSummary;
  categories: StatsCategoryItem[];
  insights: string[];
  economicIndicators: StatsEconomicIndicator[];
}

export interface StatsEconomicIndicator {
  key: 'engel' | 'rigidLiving' | 'debtRepayment' | 'optionalConsumption' | 'savingsRate';
  name: string;
  value: number | null;
  valueText: string;
  numerator: string;
  denominator: string;
  formula: string;
  description: string;
}

export interface StatsCategoryTrendResult {
  months: string[]; // YYYY-MM
  data: Array<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string | null;
    amounts: string[];
  }>;
}

export interface StatsDailySeriesResult {
  granularity: 'day' | 'month';
  points: Array<{ date: string; amount: string }>;
}

export interface StatsTopBillsResult {
  bills: Array<{
    id: string;
    amount: string;
    billDate: string;
    type: number;
    categoryName: string;
    categoryIcon: string | null;
    accountName: string;
    remark: string | null;
  }>;
}
