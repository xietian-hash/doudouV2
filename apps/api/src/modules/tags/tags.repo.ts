import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TagsRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUserId(userId: bigint) {
    return this.prisma.tag.findMany({
      where: { userId, isDeleted: 0 },
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: bigint) {
    return this.prisma.tag.findFirst({
      where: { id, isDeleted: 0 },
    });
  }

  async findByNameAndUserId(
    name: string,
    userId: bigint,
    excludeId?: bigint,
  ) {
    return this.prisma.tag.findFirst({
      where: {
        userId,
        name,
        isDeleted: 0,
        ...(excludeId !== undefined && { id: { not: excludeId } }),
      },
    });
  }

  async create(data: { userId: bigint; name: string }) {
    return this.prisma.tag.create({ data });
  }

  async update(id: bigint, data: { name: string }) {
    return this.prisma.tag.update({ where: { id }, data });
  }

  async softDeleteWithBillTags(id: bigint) {
    return this.prisma.$transaction([
      this.prisma.billTag.deleteMany({ where: { tagId: id } }),
      this.prisma.tag.update({ where: { id }, data: { isDeleted: 1 } }),
    ]);
  }
}
