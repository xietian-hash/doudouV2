import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { WechatLoginDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat-login')
  async wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatLogin(dto.wxCode, dto.nickname, dto.avatarUrl);
  }
}
