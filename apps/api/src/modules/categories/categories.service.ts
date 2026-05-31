import { Injectable } from '@nestjs/common';
import { CategoriesRepo } from './categories.repo';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';
import {
  AppException,
  ErrorCode,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '../../common/errors/business-error';

interface RawCategory {
  id: bigint;
  userId: bigint;
  parentId: bigint | null;
  name: string;
  type: number;
  icon: string | null;
  sort: number;
  lastUsedAt: Date | null;
  isDeleted: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SerializedCategory {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  type: number;
  icon: string | null;
  sort: number;
  lastUsedAt: Date | null;
  isDeleted: number;
  createdAt: Date;
  updatedAt: Date;
  children?: SerializedCategory[];
}

function serializeCategory(cat: RawCategory): SerializedCategory {
  return {
    ...cat,
    id: cat.id.toString(),
    userId: cat.userId.toString(),
    parentId: cat.parentId?.toString() ?? null,
  };
}

function buildTree(categories: RawCategory[]): SerializedCategory[] {
  const serialized = categories.map(serializeCategory);
  const map = new Map<string, SerializedCategory>();
  const roots: SerializedCategory[] = [];

  for (const cat of serialized) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of serialized) {
    const node = map.get(cat.id)!;
    if (cat.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(cat.parentId);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(node);
      } else {
        // 父节点不存在时作为根节点处理
        roots.push(node);
      }
    }
  }

  return roots;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepo) {}

  async listIcons() {
    const icons = await this.repo.findIcons();
    return icons.map((icon) => ({
      ...icon,
      id: icon.id.toString(),
    }));
  }

  async list(userId: bigint, type?: number, onlyLeaf?: boolean) {
    if (onlyLeaf) {
      const leaves = await this.repo.findLeafCategories(userId, type);
      return leaves.map(serializeCategory);
    }

    const all = await this.repo.findAllByUserId(userId, type);
    return buildTree(all);
  }

  async create(userId: bigint, dto: CreateCategoryDto) {
    const parentId = dto.parentId ? BigInt(dto.parentId) : null;

    if (parentId) {
      const parent = await this.repo.findById(parentId);
      if (!parent) {
        throw new NotFoundException('父分类不存在');
      }
      if (parent.userId !== userId) {
        throw new ForbiddenException('无权操作该分类');
      }
    }

    const existing = await this.repo.findByNameUserParent(
      dto.name,
      userId,
      parentId,
    );
    if (existing) {
      throw new ConflictException(`分类名称 "${dto.name}" 已存在`);
    }

    const category = await this.repo.create({
      userId,
      name: dto.name,
      type: dto.type,
      icon: dto.icon,
      sort: dto.sort ?? 0,
      parentId,
    });

    return serializeCategory(category);
  }

  async update(userId: bigint, id: bigint, dto: UpdateCategoryDto) {
    const category = await this.repo.findById(id);
    if (!category) {
      throw new NotFoundException('分类不存在');
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('无权操作该分类');
    }

    if (dto.name) {
      const existing = await this.repo.findByNameUserParent(
        dto.name,
        userId,
        category.parentId,
        id,
      );
      if (existing) {
        throw new ConflictException(`分类名称 "${dto.name}" 已存在`);
      }
    }

    const updated = await this.repo.update(id, {
      name: dto.name,
      icon: dto.icon,
      sort: dto.sort,
    });

    return serializeCategory(updated);
  }

  async remove(userId: bigint, id: bigint, force = false) {
    const category = await this.repo.findById(id);
    if (!category) {
      throw new NotFoundException('分类不存在');
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('无权操作该分类');
    }

    const hasChildren = await this.repo.hasChildren(id);
    if (hasChildren) {
      throw new ConflictException('该分类下存在子分类，无法删除');
    }

    const billCount = await this.repo.getBillCount(id);
    if (billCount > 0 && !force) {
      throw new AppException(
        ErrorCode.CATEGORY_HAS_BILLS,
        `该分类已关联 ${billCount} 条账单，确认删除？`,
        { billCount },
      );
    }

    await this.repo.softDelete(id);
    return { success: true };
  }
}
