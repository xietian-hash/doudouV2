import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { StatisticsService } from './statistics.service';
import {
  StatsCategoryTrendDto,
  StatsDailySeriesDto,
  StatsOverviewDto,
  StatsTopBillsDto,
} from './statistics.dto';

class CategoryExpenseQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'month 不能为空' })
  month!: string; // 格式: YYYY-MM
}

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /** @deprecated 已被 /overview 取代，保留供旧客户端使用 */
  @Get('category-expense')
  categoryExpense(
    @CurrentUser() user: JwtUser,
    @Query() query: CategoryExpenseQueryDto,
  ) {
    return this.statisticsService.categoryExpense(user.id, query.month);
  }

  @Get('overview')
  overview(@CurrentUser() user: JwtUser, @Query() query: StatsOverviewDto) {
    return this.statisticsService.overview(
      user.id,
      query.period,
      query.type,
      query.level,
      query.month,
      query.year,
    );
  }

  @Get('category-trend')
  categoryTrend(
    @CurrentUser() user: JwtUser,
    @Query() query: StatsCategoryTrendDto,
  ) {
    return this.statisticsService.categoryTrend(user.id, query.level, query.type);
  }

  @Get('daily-series')
  dailySeries(@CurrentUser() user: JwtUser, @Query() query: StatsDailySeriesDto) {
    return this.statisticsService.dailySeries(
      user.id,
      query.period,
      query.type,
      query.month,
      query.year,
    );
  }

  @Get('top-bills')
  topBills(@CurrentUser() user: JwtUser, @Query() query: StatsTopBillsDto) {
    return this.statisticsService.topBills(
      user.id,
      query.period,
      query.type,
      query.limit,
      query.month,
      query.year,
    );
  }
}
