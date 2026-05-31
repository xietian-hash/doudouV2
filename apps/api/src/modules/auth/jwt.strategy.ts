import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  openid: string;
  iat?: number;
  exp?: number;
}

export interface JwtUser {
  id: bigint;
  openid: string;
  nickname: string | null;
  avatarUrl: string | null;
  status: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'secret',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    const userId = BigInt(payload.sub);
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: 1, isDeleted: 0 },
      select: {
        id: true,
        openid: true,
        nickname: true,
        avatarUrl: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    return user;
  }
}
