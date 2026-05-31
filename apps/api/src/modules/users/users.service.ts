import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '../../common/errors/business-error';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: bigint) {
    const user = await this.prisma.user.findFirst({
      where: { id, isDeleted: 0 },
      select: {
        id: true,
        openid: true,
        nickname: true,
        avatarUrl: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      ...user,
      id: user.id.toString(),
    };
  }
}
