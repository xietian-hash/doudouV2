import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CategoriesRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUserId(userId: bigint, type?: number) {
    return this.prisma.category.findMany({
      where: {
        userId,
        isDeleted: 0,
        ...(type !== undefined && { type }),
      },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(id: bigint) {
    return this.prisma.category.findFirst({
      where: { id, isDeleted: 0 },
    });
  }

  async findByNameUserParent(
    name: string,
    userId: bigint,
    parentId: bigint | null,
    excludeId?: bigint,
  ) {
    return this.prisma.category.findFirst({
      where: {
        userId,
        name,
        parentId: parentId ?? null,
        isDeleted: 0,
        ...(excludeId !== undefined && { id: { not: excludeId } }),
      },
    });
  }

  async create(data: {
    userId: bigint;
    name: string;
    type: number;
    icon?: string;
    sort?: number;
    parentId?: bigint | null;
  }) {
    return this.prisma.category.create({ data });
  }

  async update(
    id: bigint,
    data: { name?: string; icon?: string; sort?: number },
  ) {
    return this.prisma.category.update({ where: { id }, data });
  }

  async softDelete(id: bigint) {
    return this.prisma.category.update({
      where: { id },
      data: { isDeleted: 1 },
    });
  }

  async hasChildren(parentId: bigint): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { parentId, isDeleted: 0 },
    });
    return count > 0;
  }

  async hasBills(categoryId: bigint): Promise<boolean> {
    const count = await this.prisma.bill.count({
      where: { categoryId, isDeleted: 0 },
    });
    return count > 0;
  }

  async getBillCount(categoryId: bigint): Promise<number> {
    return this.prisma.bill.count({
      where: { categoryId, isDeleted: 0 },
    });
  }

  async findIcons() {
    return this.prisma.categoryIcon.findMany({
      where: { isEnabled: 1 },
      orderBy: { sort: 'asc' },
    });
  }

  async findLeafCategories(userId: bigint, type?: number) {
    // 先获取所有分类
    const all = await this.findAllByUserId(userId, type);
    const parentIds = new Set(
      all.filter((c) => c.parentId !== null).map((c) => c.parentId!.toString()),
    );
    // 叶节点：没有子节点的分类
    const ids = new Set(all.map((c) => c.id.toString()));
    // 叶节点：id 不在 parentIds 中
    return all.filter((c) => !parentIds.has(c.id.toString()) && ids.has(c.id.toString()));
  }
}
