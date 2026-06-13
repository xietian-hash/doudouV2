import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AccountsRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUserId(userId: bigint, ledgerId: bigint) {
    return this.prisma.account.findMany({
      where: { userId, ledgerId, isDeleted: 0 },
      orderBy: [{ isDefault: 'desc' }, { sort: 'asc' }],
    });
  }

  async findById(id: bigint) {
    return this.prisma.account.findFirst({
      where: { id, isDeleted: 0 },
    });
  }

  async findByNameAndUserId(name: string, userId: bigint, ledgerId: bigint, excludeId?: bigint) {
    return this.prisma.account.findFirst({
      where: {
        userId,
        ledgerId,
        name,
        isDeleted: 0,
        ...(excludeId !== undefined && { id: { not: excludeId } }),
      },
    });
  }

  async create(data: {
    userId: bigint;
    ledgerId: bigint;
    name: string;
    type: number;
    icon?: string;
    sort?: number;
    isDefault?: number;
  }) {
    return this.prisma.account.create({ data });
  }

  async update(id: bigint, data: { name?: string; type?: number; icon?: string; sort?: number }) {
    return this.prisma.account.update({ where: { id }, data });
  }

  async softDelete(id: bigint) {
    return this.prisma.account.update({
      where: { id },
      data: { isDeleted: 1 },
    });
  }

  async hasBills(accountId: bigint): Promise<boolean> {
    const count = await this.prisma.bill.count({
      where: { accountId, isDeleted: 0 },
    });
    return count > 0;
  }

  async setDefault(userId: bigint, ledgerId: bigint, accountId: bigint) {
    return this.prisma.$transaction([
      this.prisma.account.updateMany({
        where: { userId, ledgerId, isDeleted: 0 },
        data: { isDefault: 0 },
      }),
      this.prisma.account.update({
        where: { id: accountId },
        data: { isDefault: 1 },
      }),
    ]);
  }
}
