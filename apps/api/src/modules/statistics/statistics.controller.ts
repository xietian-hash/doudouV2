import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { StatisticsService } from './statistics.service';

class CategoryExpenseQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'month 不能为空' })
  month!: string; // 格式: YYYY-MM
}

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('category-expense')
  categoryExpense(
    @CurrentUser() user: JwtUser,
    @Query() query: CategoryExpenseQueryDto,
  ) {
    return this.statisticsService.categoryExpense(user.id, query.month);
  }
}
