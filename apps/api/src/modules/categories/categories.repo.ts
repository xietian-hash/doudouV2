import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CategoriesRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUserId(userId: bigint, type?: number, ledgerId?: bigint) {
    return this.prisma.category.findMany({
      where: {
        userId,
        ...(ledgerId !== undefined && { ledgerId }),
        isDeleted: 0,
        ...(type !== undefined && { type }),
      },
      include: {
        categoryTags: {
          include: { tag: true },
          orderBy: { id: 'asc' },
        },
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
    ledgerId: bigint,
    parentId: bigint | null,
    excludeId?: bigint,
  ) {
    return this.prisma.category.findFirst({
      where: {
        userId,
        ledgerId,
        name,
        parentId: parentId ?? null,
        isDeleted: 0,
        ...(excludeId !== undefined && { id: { not: excludeId } }),
      },
    });
  }

  async findSubcategoryByName(
    name: string,
    userId: bigint,
    ledgerId: bigint,
    excludeId?: bigint,
  ) {
    return this.prisma.category.findFirst({
      where: {
        userId,
        ledgerId,
        name,
        parentId: { not: null },
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
    parentId?: bigint | null;
  }) {
    return this.prisma.category.create({ data });
  }

  async replaceCategoryTags(categoryId: bigint, tagIds: bigint[]) {
    await this.prisma.$transaction([
      this.prisma.categoryTag.deleteMany({ where: { categoryId } }),
      ...(tagIds.length
        ? [
            this.prisma.categoryTag.createMany({
              data: tagIds.map((tagId) => ({ categoryId, tagId })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  }

  async findEconomicTagsByUserId(userId: bigint, ledgerId: bigint) {
    return this.prisma.tag.findMany({
      where: {
        userId,
        ledgerId,
        isDeleted: 0,
        tagType: 'economic',
      },
      orderBy: { id: 'asc' },
    });
  }

  async update(id: bigint, data: { name?: string; icon?: string; sort?: number }) {
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

  async findLeafCategories(userId: bigint, type?: number, ledgerId?: bigint) {
    // 先获取所有分类
    const all = await this.findAllByUserId(userId, type, ledgerId);
    const parentIds = new Set(
      all.filter((c) => c.parentId !== null).map((c) => c.parentId!.toString()),
    );
    // 叶节点：没有子节点的分类
    const ids = new Set(all.map((c) => c.id.toString()));
    // 叶节点：id 不在 parentIds 中
    return all.filter((c) => !parentIds.has(c.id.toString()) && ids.has(c.id.toString()));
  }
}
