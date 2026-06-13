import { Injectable } from '@nestjs/common';
import { TagsRepo } from './tags.repo';
import { CreateTagDto, UpdateTagDto } from './tags.dto';
import { LedgersService } from '../ledgers/ledgers.service';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  AppException,
  ErrorCode,
} from '../../common/errors/business-error';

function serializeTag(tag: {
  id: bigint;
  userId: bigint;
  ledgerId: bigint;
  name: string;
  description: string | null;
  tagType: string;
  canEdit: number;
  canDelete: number;
  isDeleted: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...tag,
    id: tag.id.toString(),
    userId: tag.userId.toString(),
    ledgerId: tag.ledgerId.toString(),
    canEdit: tag.canEdit === 1,
    canDelete: tag.canDelete === 1,
  };
}

@Injectable()
export class TagsService {
  constructor(
    private readonly repo: TagsRepo,
    private readonly ledgersService: LedgersService,
  ) {}

  async list(userId: bigint) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const tags = await this.repo.findAllByUserId(userId, ledger.id);
    return tags.map(serializeTag);
  }

  async create(userId: bigint, dto: CreateTagDto) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const existing = await this.repo.findByNameAndUserId(dto.name, userId, ledger.id);
    if (existing) {
      throw new ConflictException(`标签名称 "${dto.name}" 已存在`);
    }

    const tag = await this.repo.create({
      userId,
      ledgerId: ledger.id,
      name: dto.name,
      description: normalizeDescription(dto.description),
    });
    return serializeTag(tag);
  }

  async update(userId: bigint, id: bigint, dto: UpdateTagDto) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const tag = await this.repo.findById(id);
    if (!tag) {
      throw new NotFoundException('标签不存在');
    }
    if (tag.userId !== userId) {
      throw new ForbiddenException('无权操作该标签');
    }
    if (tag.ledgerId !== ledger.id) {
      throw new ForbiddenException('无权操作该标签');
    }
    if (tag.canEdit !== 1) {
      throw new ForbiddenException('该标签不允许编辑');
    }

    const existing = await this.repo.findByNameAndUserId(dto.name, userId, ledger.id, id);
    if (existing) {
      throw new ConflictException(`标签名称 "${dto.name}" 已存在`);
    }

    const updateData: { name: string; description?: string | null } = {
      name: dto.name,
    };
    if (dto.description !== undefined) {
      updateData.description = normalizeDescription(dto.description);
    }

    const updated = await this.repo.update(id, updateData);
    return serializeTag(updated);
  }

  async remove(userId: bigint, id: bigint) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const tag = await this.repo.findById(id);
    if (!tag) {
      throw new NotFoundException('标签不存在');
    }
    if (tag.userId !== userId) {
      throw new ForbiddenException('无权操作该标签');
    }
    if (tag.ledgerId !== ledger.id) {
      throw new ForbiddenException('无权操作该标签');
    }
    if (tag.canDelete !== 1) {
      throw new ForbiddenException('该标签不允许删除');
    }

    const billCount = await this.repo.getBillCount(id);
    if (billCount > 0) {
      throw new AppException(ErrorCode.TAG_HAS_BILLS, `该标签已关联 ${billCount} 条账单，无法删除`);
    }

    await this.repo.softDeleteWithBillTags(id);
    return { success: true };
  }
}

function normalizeDescription(description?: string) {
  const value = description?.trim();
  return value || null;
}
