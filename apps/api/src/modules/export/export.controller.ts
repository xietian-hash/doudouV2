import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { ExportService } from './export.service';

export class ExportBillsDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email!: string;
}

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('bills')
  async exportBills(@CurrentUser() user: JwtUser, @Body() dto: ExportBillsDto) {
    await this.exportService.exportBills(user.id, dto.email);
    return null;
  }
}
