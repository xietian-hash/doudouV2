import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LedgersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateDefaultLedger(userId: bigint) {
    const existing = await this.prisma.ledger.findFirst({
      where: { userId, isDeleted: 0, isDefault: 1 },
      orderBy: { id: 'asc' },
    });
    if (existing) return existing;

    return this.prisma.ledger.create({
      data: {
        userId,
        name: '日常账本',
        sceneType: 'personal',
        isDefault: 1,
      },
    });
  }
}
