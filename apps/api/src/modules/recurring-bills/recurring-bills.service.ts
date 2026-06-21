import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RecurringBillsRepo } from './recurring-bills.repo';
import { CreateRecurringBillDto, UpdateRecurringBillDto } from './recurring-bills.dto';
import {
  NotFoundException,
  ForbiddenException,
  ValidationException,
} from '../../common/errors/business-error';
import { CategoriesRepo } from '../categories/categories.repo';
import { AccountsRepo } from '../accounts/accounts.repo';
import { LedgersService } from '../ledgers/ledgers.service';

type RawRecurringBill = {
  id: bigint;
  userId: bigint;
  ledgerId: bigint;
  accountId: bigint;
  categoryId: bigint;
  type: number;
  amount: object;
  remark: string | null;
  repeatType: number;
  repeatDay: number | null;
  repeatMonth: number | null;
  startDate: Date;
  endDate: Date | null;
  lastGeneratedDate: Date | null;
  isActive: number;
  isDeleted: number;
  createdAt: Date;
  updatedAt: Date;
  account?: { id: bigint; name: string } | null;
  category?: {
    id: bigint;
    name: string;
    icon: string | null;
    parentId: bigint | null;
    parent?: { id: bigint; name: string; icon: string | null } | null;
  } | null;
};

function buildRepeatDesc(rb: RawRecurringBill): string {
  if (rb.repeatType === 1) return '每天';
  if (rb.repeatType === 2) return `每月${rb.repeatDay}日`;
  if (rb.repeatType === 3) return `每年${rb.repeatMonth}月${rb.repeatDay}日`;
  return '';
}

function computeNextGenerateDate(rb: RawRecurringBill): string | null {
  if (!rb.isActive) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let from: Date;
  if (rb.lastGeneratedDate) {
    from = new Date(rb.lastGeneratedDate);
    from.setDate(from.getDate() + 1);
  } else {
    from = new Date(rb.startDate);
  }
  from.setHours(0, 0, 0, 0);

  const endDate = rb.endDate ? new Date(rb.endDate) : null;
  if (endDate) endDate.setHours(0, 0, 0, 0);

  // 从 from 和 today 中取较大值开始向后搜索
  const searchFrom = from > today ? from : today;

  for (let i = 0; i < 400; i++) {
    const d = new Date(searchFrom);
    d.setDate(d.getDate() + i);
    if (endDate && d > endDate) return null;
    if (shouldGenerateOnDate(rb, d)) {
      return d.toISOString().split('T')[0];
    }
  }
  return null;
}

export function shouldGenerateOnDate(rb: RawRecurringBill, date: Date): boolean {
  if (rb.repeatType === 1) return true;
  if (rb.repeatType === 2) {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const target = Math.min(rb.repeatDay!, daysInMonth);
    return date.getDate() === target;
  }
  if (rb.repeatType === 3) {
    const targetMonth = rb.repeatMonth! - 1;
    if (date.getMonth() !== targetMonth) return false;
    const daysInMonth = new Date(date.getFullYear(), targetMonth + 1, 0).getDate();
    const target = Math.min(rb.repeatDay!, daysInMonth);
    return date.getDate() === target;
  }
  return false;
}

export function serializeRecurringBill(rb: RawRecurringBill) {
  return {
    id: rb.id.toString(),
    ledgerId: rb.ledgerId.toString(),
    accountId: rb.accountId.toString(),
    accountName: rb.account?.name ?? '',
    categoryId: rb.categoryId.toString(),
    categoryName: rb.category?.parent?.name
      ? rb.category.name
      : rb.category?.name ?? '',
    categoryIcon: rb.category?.icon ?? null,
    type: rb.type,
    amount: (rb.amount as Prisma.Decimal).toString(),
    remark: rb.remark,
    repeatType: rb.repeatType,
    repeatDay: rb.repeatDay,
    repeatMonth: rb.repeatMonth,
    repeatDesc: buildRepeatDesc(rb),
    startDate: rb.startDate.toISOString().split('T')[0],
    endDate: rb.endDate ? rb.endDate.toISOString().split('T')[0] : null,
    lastGeneratedDate: rb.lastGeneratedDate
      ? rb.lastGeneratedDate.toISOString().split('T')[0]
      : null,
    nextGenerateDate: computeNextGenerateDate(rb),
    isActive: rb.isActive,
    createdAt: rb.createdAt,
    updatedAt: rb.updatedAt,
  };
}

@Injectable()
export class RecurringBillsService {
  constructor(
    private readonly repo: RecurringBillsRepo,
    private readonly categoriesRepo: CategoriesRepo,
    private readonly accountsRepo: AccountsRepo,
    private readonly ledgersService: LedgersService,
  ) {}

  async list(userId: bigint) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const items = await this.repo.findAllByUser(userId, ledger.id);
    return items.map(serializeRecurringBill);
  }

  async findOne(userId: bigint, id: bigint) {
    const rb = await this.repo.findById(id);
    if (!rb) throw new NotFoundException('重复账单不存在');
    if (rb.userId !== userId) throw new ForbiddenException('无权查看该重复账单');
    return serializeRecurringBill(rb);
  }

  private async validate(userId: bigint, ledgerId: bigint, dto: CreateRecurringBillDto) {
    const accountId = BigInt(dto.accountId);
    const categoryId = BigInt(dto.categoryId);

    const account = await this.accountsRepo.findById(accountId);
    if (!account) throw new NotFoundException('账户不存在');
    if (account.userId !== userId) throw new ForbiddenException('无权使用该账户');

    const category = await this.categoriesRepo.findById(categoryId);
    if (!category) throw new NotFoundException('分类不存在');
    if (category.userId !== userId) throw new ForbiddenException('无权使用该分类');
    const hasChildren = await this.categoriesRepo.hasChildren(categoryId);
    if (hasChildren) throw new ValidationException('只能选择叶子分类');

    if (dto.repeatType === 2 && !dto.repeatDay) {
      throw new ValidationException('按月重复时 repeatDay 必填');
    }
    if (dto.repeatType === 3 && (!dto.repeatDay || !dto.repeatMonth)) {
      throw new ValidationException('按年重复时 repeatDay 和 repeatMonth 必填');
    }
    if (dto.endDate && dto.endDate < dto.startDate) {
      throw new ValidationException('结束日期不能早于开始日期');
    }

    return { accountId, categoryId };
  }

  async create(userId: bigint, dto: CreateRecurringBillDto) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const { accountId, categoryId } = await this.validate(userId, ledger.id, dto);

    const rb = await this.repo.create({
      userId,
      ledgerId: ledger.id,
      accountId,
      categoryId,
      type: dto.type,
      amount: new Prisma.Decimal(dto.amount),
      remark: dto.remark,
      repeatType: dto.repeatType,
      repeatDay: dto.repeatDay ?? null,
      repeatMonth: dto.repeatMonth ?? null,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    } as Prisma.RecurringBillUncheckedCreateInput);

    return serializeRecurringBill(rb);
  }

  async update(userId: bigint, id: bigint, dto: UpdateRecurringBillDto) {
    const rb = await this.repo.findById(id);
    if (!rb) throw new NotFoundException('重复账单不存在');
    if (rb.userId !== userId) throw new ForbiddenException('无权操作该重复账单');

    const { accountId, categoryId } = await this.validate(userId, rb.ledgerId, dto);

    const updated = await this.repo.update(id, {
      accountId,
      categoryId,
      type: dto.type,
      amount: new Prisma.Decimal(dto.amount),
      remark: dto.remark ?? null,
      repeatType: dto.repeatType,
      repeatDay: dto.repeatDay ?? null,
      repeatMonth: dto.repeatMonth ?? null,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    } as Prisma.RecurringBillUncheckedUpdateInput);

    return serializeRecurringBill(updated);
  }

  async remove(userId: bigint, id: bigint) {
    const rb = await this.repo.findById(id);
    if (!rb) throw new NotFoundException('重复账单不存在');
    if (rb.userId !== userId) throw new ForbiddenException('无权操作该重复账单');
    await this.repo.softDelete(id);
    return { success: true };
  }

  async toggle(userId: bigint, id: bigint) {
    const rb = await this.repo.findById(id);
    if (!rb) throw new NotFoundException('重复账单不存在');
    if (rb.userId !== userId) throw new ForbiddenException('无权操作该重复账单');
    const newStatus = rb.isActive === 1 ? 0 : 1;
    await this.repo.toggle(id, newStatus);
    return { isActive: newStatus };
  }
}
