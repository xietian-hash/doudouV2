import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WechatService } from './wechat.service';
import { UserInitService } from '../users/user-init.service';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    openid: string;
    nickname: string | null;
    avatarUrl: string | null;
    phone: string | null;
    status: number;
    createdAt: Date;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly wechatService: WechatService,
    private readonly userInitService: UserInitService,
  ) {}

  async wechatLogin(
    wxCode: string,
    nickname?: string,
    avatarUrl?: string,
  ): Promise<LoginResult> {
    const openid = await this.wechatService.getOpenid(wxCode);

    let user = await this.prisma.user.findUnique({ where: { openid } });
    let isNewUser = false;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openid,
          nickname: nickname ?? null,
          avatarUrl: avatarUrl ?? null,
          status: 1,
        },
      });
      isNewUser = true;
      this.logger.log(`新用户注册 userId=${user.id} openid=${openid}`);
    } else {
      // 更新用户信息（如果有提供）
      if (nickname ?? avatarUrl) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            ...(nickname !== undefined && { nickname }),
            ...(avatarUrl !== undefined && { avatarUrl }),
          },
        });
      }
    }

    if (isNewUser) {
      await this.userInitService.initNewUser(this.prisma, user.id);
    }

    const payload = { sub: user.id.toString(), openid: user.openid };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id.toString(),
        openid: user.openid,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        status: user.status,
        createdAt: user.createdAt,
      },
    };
  }
}
