import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { RecurringBillsService } from './recurring-bills.service';
import { CreateRecurringBillDto, UpdateRecurringBillDto } from './recurring-bills.dto';

@Controller('recurring-bills')
@UseGuards(JwtAuthGuard)
export class RecurringBillsController {
  constructor(private readonly recurringBillsService: RecurringBillsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.recurringBillsService.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateRecurringBillDto) {
    return this.recurringBillsService.create(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.recurringBillsService.findOne(user.id, BigInt(id));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringBillDto,
  ) {
    return this.recurringBillsService.update(user.id, BigInt(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.recurringBillsService.remove(user.id, BigInt(id));
  }

  @Patch(':id/toggle')
  toggle(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.recurringBillsService.toggle(user.id, BigInt(id));
  }
}
