import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TagsRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUserId(userId: bigint, ledgerId: bigint) {
    return this.prisma.tag.findMany({
      where: { userId, ledgerId, isDeleted: 0 },
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: bigint) {
    return this.prisma.tag.findFirst({
      where: { id, isDeleted: 0 },
    });
  }

  async findByNameAndUserId(name: string, userId: bigint, ledgerId: bigint, excludeId?: bigint) {
    return this.prisma.tag.findFirst({
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
    description?: string | null;
    tagType?: string;
    canEdit?: number;
    canDelete?: number;
  }) {
    return this.prisma.tag.create({
      data: {
        userId: data.userId,
        ledgerId: data.ledgerId,
        name: data.name,
        description: data.description ?? null,
        tagType: data.tagType ?? 'user',
        canEdit: data.canEdit ?? 1,
        canDelete: data.canDelete ?? 1,
      },
    });
  }

  async update(id: bigint, data: { name: string; description?: string | null }) {
    return this.prisma.tag.update({ where: { id }, data });
  }

  async getBillCount(tagId: bigint) {
    return this.prisma.billTag.count({ where: { tagId } });
  }

  async softDeleteWithBillTags(id: bigint) {
    return this.prisma.$transaction([
      this.prisma.billTag.deleteMany({ where: { tagId: id } }),
      this.prisma.tag.update({ where: { id }, data: { isDeleted: 1 } }),
    ]);
  }
}
