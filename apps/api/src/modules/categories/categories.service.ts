import { Injectable, Logger } from '@nestjs/common';
import { CategoriesRepo } from './categories.repo';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';
import { LlmService } from '../voice/llm.service';
import { LedgersService } from '../ledgers/ledgers.service';
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
  ledgerId: bigint;
  parentId: bigint | null;
  name: string;
  type: number;
  icon: string | null;
  sort: number;
  lastUsedAt: Date | null;
  isDeleted: number;
  createdAt: Date;
  updatedAt: Date;
  categoryTags?: Array<{
    tag: {
      id: bigint;
      userId: bigint;
      name: string;
      description: string | null;
      tagType: string;
      canEdit: number;
      canDelete: number;
      isDeleted: number;
      createdAt: Date;
      updatedAt: Date;
    };
  }>;
}

export interface SerializedCategory {
  id: string;
  userId: string;
  ledgerId: string;
  parentId: string | null;
  name: string;
  type: number;
  icon: string | null;
  sort: number;
  lastUsedAt: Date | null;
  isDeleted: number;
  createdAt: Date;
  updatedAt: Date;
  tags?: Array<{
    id: string;
    userId: string;
    name: string;
    description: string | null;
    tagType: string;
    canEdit: boolean;
    canDelete: boolean;
  }>;
  children?: SerializedCategory[];
}

function serializeCategory(cat: RawCategory): SerializedCategory {
  return {
    ...cat,
    id: cat.id.toString(),
    userId: cat.userId.toString(),
    ledgerId: cat.ledgerId.toString(),
    parentId: cat.parentId?.toString() ?? null,
    tags: cat.categoryTags?.map(({ tag }) => ({
      id: tag.id.toString(),
      userId: tag.userId.toString(),
      name: tag.name,
      description: tag.description,
      tagType: tag.tagType,
      canEdit: tag.canEdit === 1,
      canDelete: tag.canDelete === 1,
    })),
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
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly repo: CategoriesRepo,
    private readonly llmService: LlmService,
    private readonly ledgersService: LedgersService,
  ) {}

  async listIcons() {
    const icons = await this.repo.findIcons();
    return icons.map((icon) => ({
      ...icon,
      id: icon.id.toString(),
    }));
  }

  async list(userId: bigint, type?: number, onlyLeaf?: boolean) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    if (onlyLeaf) {
      const leaves = await this.repo.findLeafCategories(userId, type, ledger.id);
      return leaves.map(serializeCategory);
    }

    const all = await this.repo.findAllByUserId(userId, type, ledger.id);
    return buildTree(all);
  }

  async create(userId: bigint, dto: CreateCategoryDto) {
    const parentId = dto.parentId ? BigInt(dto.parentId) : null;
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    let parentCategoryName = '';

    if (parentId) {
      const parent = await this.repo.findById(parentId);
      if (!parent) {
        throw new NotFoundException('父分类不存在');
      }
      if (parent.userId !== userId) {
        throw new ForbiddenException('无权操作该分类');
      }
      if (parent.ledgerId !== ledger.id) {
        throw new ForbiddenException('无权操作该分类');
      }
      parentCategoryName = parent.name;
    }

    const existing = parentId
      ? await this.repo.findSubcategoryByName(dto.name, userId, ledger.id)
      : await this.repo.findByNameUserParent(dto.name, userId, ledger.id, null);
    if (existing) {
      throw new ConflictException(
        parentId ? `二级分类名称 "${dto.name}" 已被其他分类使用` : `分类名称 "${dto.name}" 已存在`,
      );
    }

    const category = await this.repo.create({
      userId,
      ledgerId: ledger.id,
      name: dto.name,
      type: dto.type,
      icon: dto.icon,
      sort: dto.sort ?? 0,
      parentId,
    });

    if (parentId && dto.type === 1) {
      this.assignEconomicTagAsync(userId, category.id, parentCategoryName, category.name);
    }

    return serializeCategory(category);
  }

  async update(userId: bigint, id: bigint, dto: UpdateCategoryDto) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const category = await this.repo.findById(id);
    if (!category) {
      throw new NotFoundException('分类不存在');
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('无权操作该分类');
    }
    if (category.ledgerId !== ledger.id) {
      throw new ForbiddenException('无权操作该分类');
    }

    if (dto.name) {
      const existing = category.parentId
        ? await this.repo.findSubcategoryByName(dto.name, userId, ledger.id, id)
        : await this.repo.findByNameUserParent(dto.name, userId, ledger.id, null, id);
      if (existing) {
        throw new ConflictException(
          category.parentId
            ? `二级分类名称 "${dto.name}" 已被其他分类使用`
            : `分类名称 "${dto.name}" 已存在`,
        );
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
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const category = await this.repo.findById(id);
    if (!category) {
      throw new NotFoundException('分类不存在');
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('无权操作该分类');
    }
    if (category.ledgerId !== ledger.id) {
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

  private assignEconomicTagAsync(
    userId: bigint,
    categoryId: bigint,
    parentCategoryName: string,
    categoryName: string,
  ) {
    void this.assignEconomicTag(userId, categoryId, parentCategoryName, categoryName).catch(
      (error) => {
        this.logger.error(
          `异步绑定经济属性标签失败 userId=${userId} categoryId=${categoryId} category="${categoryName}"`,
          error,
        );
      },
    );
  }

  private async assignEconomicTag(
    userId: bigint,
    categoryId: bigint,
    parentCategoryName: string,
    categoryName: string,
  ) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const economicTags = await this.repo.findEconomicTagsByUserId(userId, ledger.id);
    if (!economicTags.length) {
      this.logger.warn(`未找到经济属性标签 userId=${userId} categoryId=${categoryId}`);
      return;
    }

    const fallbackTag = economicTags.find((tag) => tag.name === '不计入统计') || economicTags[0];
    const recommendedName = await this.llmService.recommendEconomicTag({
      parentCategoryName,
      categoryName,
      tagOptions: economicTags.map((tag) => ({
        name: tag.name,
        description: tag.description,
      })),
    });
    const selectedTag = economicTags.find((tag) => tag.name === recommendedName) || fallbackTag;

    await this.repo.replaceCategoryTags(categoryId, [selectedTag.id]);
    this.logger.log(
      `已绑定经济属性标签 userId=${userId} categoryId=${categoryId} category="${categoryName}" tag="${selectedTag.name}" recommended="${recommendedName ?? ''}"`,
    );
  }
}
