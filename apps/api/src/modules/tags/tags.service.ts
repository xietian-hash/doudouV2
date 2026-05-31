import { Injectable } from '@nestjs/common';
import { TagsRepo } from './tags.repo';
import { CreateTagDto, UpdateTagDto } from './tags.dto';
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
  name: string;
  isDeleted: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...tag,
    id: tag.id.toString(),
    userId: tag.userId.toString(),
  };
}

@Injectable()
export class TagsService {
  constructor(private readonly repo: TagsRepo) {}

  async list(userId: bigint) {
    const tags = await this.repo.findAllByUserId(userId);
    return tags.map(serializeTag);
  }

  async create(userId: bigint, dto: CreateTagDto) {
    const existing = await this.repo.findByNameAndUserId(dto.name, userId);
    if (existing) {
      throw new ConflictException(`标签名称 "${dto.name}" 已存在`);
    }

    const tag = await this.repo.create({ userId, name: dto.name });
    return serializeTag(tag);
  }

  async update(userId: bigint, id: bigint, dto: UpdateTagDto) {
    const tag = await this.repo.findById(id);
    if (!tag) {
      throw new NotFoundException('标签不存在');
    }
    if (tag.userId !== userId) {
      throw new ForbiddenException('无权操作该标签');
    }

    const existing = await this.repo.findByNameAndUserId(dto.name, userId, id);
    if (existing) {
      throw new ConflictException(`标签名称 "${dto.name}" 已存在`);
    }

    const updated = await this.repo.update(id, { name: dto.name });
    return serializeTag(updated);
  }

  async remove(userId: bigint, id: bigint) {
    const tag = await this.repo.findById(id);
    if (!tag) {
      throw new NotFoundException('标签不存在');
    }
    if (tag.userId !== userId) {
      throw new ForbiddenException('无权操作该标签');
    }

    const billCount = await this.repo.getBillCount(id);
    if (billCount > 0) {
      throw new AppException(
        ErrorCode.TAG_HAS_BILLS,
        `该标签已关联 ${billCount} 条账单，无法删除`,
      );
    }

    await this.repo.softDeleteWithBillTags(id);
    return { success: true };
  }
}
