import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { ForbiddenException } from '../../common/errors/business-error';
import { AdminService } from './admin.service';

const ADMIN_USER_ID = 1n;

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('user-stats')
  getUserStats(@CurrentUser() user: JwtUser) {
    if (user.id !== ADMIN_USER_ID) {
      throw new ForbiddenException();
    }
    return this.adminService.getUserStats();
  }
}
