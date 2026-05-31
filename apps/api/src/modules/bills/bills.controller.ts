import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { BillsService } from './bills.service';
import {
  CreateBillDto,
  UpdateBillDto,
  BatchCreateBillDto,
  GetBillsQueryDto,
  GetCalendarSummaryQueryDto,
} from './bills.dto';

@Controller('bills')
@UseGuards(JwtAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get('calendar-summary')
  calendarSummary(
    @CurrentUser() user: JwtUser,
    @Query() query: GetCalendarSummaryQueryDto,
  ) {
    return this.billsService.calendarSummary(user.id, query.month);
  }

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: GetBillsQueryDto) {
    return this.billsService.list(user.id, query);
  }

  @Post('batch')
  batchCreate(@CurrentUser() user: JwtUser, @Body() dto: BatchCreateBillDto) {
    return this.billsService.batchCreate(user.id, dto.bills);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateBillDto) {
    return this.billsService.create(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.billsService.findOne(user.id, BigInt(id));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateBillDto,
  ) {
    return this.billsService.update(user.id, BigInt(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.billsService.remove(user.id, BigInt(id));
  }
}
