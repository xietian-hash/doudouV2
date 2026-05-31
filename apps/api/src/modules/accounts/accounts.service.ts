import { Injectable } from '@nestjs/common';
import { AccountsRepo } from './accounts.repo';
import { CreateAccountDto, UpdateAccountDto } from './accounts.dto';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '../../common/errors/business-error';

function serializeAccount(account: {
  id: bigint;
  userId: bigint;
  name: string;
  type: number;
  balance: object;
  icon: string | null;
  sort: number;
  isDefault: number;
  isDeleted: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...account,
    id: account.id.toString(),
    userId: account.userId.toString(),
    balance: account.balance.toString(),
  };
}

@Injectable()
export class AccountsService {
  constructor(private readonly repo: AccountsRepo) {}

  async list(userId: bigint) {
    const accounts = await this.repo.findAllByUserId(userId);
    return accounts.map(serializeAccount);
  }

  async create(userId: bigint, dto: CreateAccountDto) {
    const existing = await this.repo.findByNameAndUserId(dto.name, userId);
    if (existing) {
      throw new ConflictException(`账户名称 "${dto.name}" 已存在`);
    }

    const account = await this.repo.create({
      userId,
      name: dto.name,
      type: dto.type,
      icon: dto.icon,
      sort: dto.sort ?? 0,
    });

    return serializeAccount(account);
  }

  async update(userId: bigint, id: bigint, dto: UpdateAccountDto) {
    const account = await this.repo.findById(id);
    if (!account) {
      throw new NotFoundException('账户不存在');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('无权操作该账户');
    }

    if (dto.name) {
      const existing = await this.repo.findByNameAndUserId(
        dto.name,
        userId,
        id,
      );
      if (existing) {
        throw new ConflictException(`账户名称 "${dto.name}" 已存在`);
      }
    }

    const updated = await this.repo.update(id, {
      name: dto.name,
      type: dto.type,
      icon: dto.icon,
      sort: dto.sort,
    });

    return serializeAccount(updated);
  }

  async remove(userId: bigint, id: bigint) {
    const account = await this.repo.findById(id);
    if (!account) {
      throw new NotFoundException('账户不存在');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('无权操作该账户');
    }

    const hasBills = await this.repo.hasBills(id);
    if (hasBills) {
      throw new ConflictException('该账户下存在账单，无法删除');
    }

    await this.repo.softDelete(id);
    return { success: true };
  }

  async setDefault(userId: bigint, id: bigint) {
    const account = await this.repo.findById(id);
    if (!account) {
      throw new NotFoundException('账户不存在');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('无权操作该账户');
    }

    await this.repo.setDefault(userId, id);
    return { success: true };
  }
}
