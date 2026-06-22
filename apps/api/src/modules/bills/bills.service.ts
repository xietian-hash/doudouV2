import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BillsRepo } from './bills.repo';
import { CreateBillDto, UpdateBillDto, GetBillsQueryDto } from './bills.dto';
import {
  NotFoundException,
  ForbiddenException,
  ValidationException,
} from '../../common/errors/business-error';
import { CategoriesRepo } from '../categories/categories.repo';
import { AccountsRepo } from '../accounts/accounts.repo';
import { LedgersService } from '../ledgers/ledgers.service';
import { TagsRepo } from '../tags/tags.repo';

function serializeBill(bill: {
  id: bigint;
  userId: bigint;
  ledgerId: bigint;
  accountId: bigint;
  categoryId: bigint;
  type: number;
  amount: object;
  remark: string | null;
  billDate: Date;
  source: number;
  voiceText: string | null;
  recurringBillId?: bigint | null;
  isDeleted: number;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    id: bigint;
    name: string;
    icon: string | null;
    parentId: bigint | null;
    parent?: { id: bigint; name: string; icon: string | null } | null;
  };
  account?: { id: bigint; name: string };
  billTags?: Array<{ tag: { id: bigint; name: string } }>;
}) {
  return {
    ...bill,
    id: bill.id.toString(),
    userId: bill.userId.toString(),
    ledgerId: bill.ledgerId.toString(),
    accountId: bill.accountId.toString(),
    categoryId: bill.categoryId.toString(),
    recurringBillId: bill.recurringBillId != null ? bill.recurringBillId.toString() : null,
    amount: bill.amount.toString(),
    category: bill.category
      ? {
          ...bill.category,
          id: bill.category.id.toString(),
          parentId: bill.category.parentId?.toString() ?? null,
          parent: bill.category.parent
            ? {
                ...bill.category.parent,
                id: bill.category.parent.id.toString(),
              }
            : null,
        }
      : undefined,
    account: bill.account ? { ...bill.account, id: bill.account.id.toString() } : undefined,
    billTags: bill.billTags?.map((bt) => ({
      id: bt.tag.id.toString(),
      name: bt.tag.name,
    })),
    categoryName: bill.category?.name ?? '',
    categoryIcon: bill.category?.icon ?? null,
    accountName: bill.account?.name ?? '',
    tags:
      bill.billTags?.map((bt) => ({
        id: bt.tag.id.toString(),
        name: bt.tag.name,
      })) ?? [],
  };
}

@Injectable()
export class BillsService {
  constructor(
    private readonly repo: BillsRepo,
    private readonly categoriesRepo: CategoriesRepo,
    private readonly accountsRepo: AccountsRepo,
    private readonly ledgersService: LedgersService,
    private readonly tagsRepo: TagsRepo,
  ) {}

  async list(userId: bigint, query: GetBillsQueryDto) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const { total, bills } = await this.repo.findAll(userId, ledger.id, {
      month: query.month,
      date: query.date,
      year: query.year,
      categoryId: query.categoryId,
      type: query.type,
      pageNo: query.pageNo ?? 1,
      pageSize: query.pageSize ?? 20,
    });

    return {
      total,
      pageNo: query.pageNo ?? 1,
      pageSize: query.pageSize ?? 20,
      list: bills.map(serializeBill),
    };
  }

  private async validateBillInput(
    userId: bigint,
    ledgerId: bigint,
    accountId: bigint,
    categoryId: bigint,
  ) {
    // 验证账户归属
    const account = await this.accountsRepo.findById(accountId);
    if (!account) throw new NotFoundException('账户不存在');
    if (account.userId !== userId) throw new ForbiddenException('无权使用该账户');
    if (account.ledgerId !== ledgerId) throw new ForbiddenException('无权使用该账户');

    // 验证分类归属和叶节点
    const category = await this.categoriesRepo.findById(categoryId);
    if (!category) throw new NotFoundException('分类不存在');
    if (category.userId !== userId) throw new ForbiddenException('无权使用该分类');
    if (category.ledgerId !== ledgerId) throw new ForbiddenException('无权使用该分类');

    const hasChildren = await this.categoriesRepo.hasChildren(categoryId);
    if (hasChildren) {
      throw new ValidationException('只能选择叶子分类（无子分类的分类）');
    }

    return { account, category };
  }

  private async validateTagIds(userId: bigint, ledgerId: bigint, tagIds: bigint[]) {
    for (const tagId of tagIds) {
      const tag = await this.tagsRepo.findById(tagId);
      if (!tag) throw new NotFoundException('标签不存在');
      if (tag.userId !== userId || tag.ledgerId !== ledgerId) {
        throw new ForbiddenException('无权使用该标签');
      }
    }
  }

  async create(userId: bigint, dto: CreateBillDto) {
    const accountId = BigInt(dto.accountId);
    const categoryId = BigInt(dto.categoryId);
    const tagIds = (dto.tagIds ?? []).map((id) => BigInt(id));
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);

    await this.validateBillInput(userId, ledger.id, accountId, categoryId);
    await this.validateTagIds(userId, ledger.id, tagIds);

    const amount = new Prisma.Decimal(dto.amount);
    const balanceDelta = dto.type === 1 ? amount.negated() : amount;

    const bill = await this.repo.getClient().$transaction(async (tx) => {
      const created = await this.repo.create(tx, {
        userId,
        ledgerId: ledger.id,
        accountId,
        categoryId,
        type: dto.type,
        amount,
        remark: dto.remark,
        billDate: new Date(dto.billDate),
        source: dto.source ?? 1,
        voiceText: dto.voiceText,
      });

      if (tagIds.length > 0) {
        await this.repo.createBillTags(tx, created.id, tagIds);
      }

      await this.repo.updateAccount(tx, accountId, balanceDelta);
      await this.repo.updateCategoryLastUsedAt(tx, categoryId);

      return created;
    });

    const detail = await this.repo.findById(bill.id);
    return serializeBill(detail!);
  }

  async batchCreate(userId: bigint, dtos: CreateBillDto[]) {
    const results: ReturnType<typeof serializeBill>[] = [];

    await this.repo.getClient().$transaction(async (tx) => {
      for (const dto of dtos) {
        const accountId = BigInt(dto.accountId);
        const categoryId = BigInt(dto.categoryId);
        const tagIds = (dto.tagIds ?? []).map((id) => BigInt(id));
        const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);

        await this.validateBillInput(userId, ledger.id, accountId, categoryId);
        await this.validateTagIds(userId, ledger.id, tagIds);

        const amount = new Prisma.Decimal(dto.amount);
        const balanceDelta = dto.type === 1 ? amount.negated() : amount;

        const created = await this.repo.create(tx, {
          userId,
          ledgerId: ledger.id,
          accountId,
          categoryId,
          type: dto.type,
          amount,
          remark: dto.remark,
          billDate: new Date(dto.billDate),
          source: dto.source ?? 1,
          voiceText: dto.voiceText,
        });

        if (tagIds.length > 0) {
          await this.repo.createBillTags(tx, created.id, tagIds);
        }

        await this.repo.updateAccount(tx, accountId, balanceDelta);
        await this.repo.updateCategoryLastUsedAt(tx, categoryId);

        results.push(serializeBill(created));
      }
    });

    return results;
  }

  async findOne(userId: bigint, id: bigint) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const bill = await this.repo.findById(id);
    if (!bill) throw new NotFoundException('账单不存在');
    if (bill.userId !== userId) throw new ForbiddenException('无权查看该账单');
    if (bill.ledgerId !== ledger.id) throw new ForbiddenException('无权查看该账单');
    return serializeBill(bill);
  }

  async update(userId: bigint, id: bigint, dto: UpdateBillDto) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const bill = await this.repo.findById(id);
    if (!bill) throw new NotFoundException('账单不存在');
    if (bill.userId !== userId) throw new ForbiddenException('无权操作该账单');
    if (bill.ledgerId !== ledger.id) throw new ForbiddenException('无权操作该账单');

    const newAccountId = dto.accountId ? BigInt(dto.accountId) : bill.accountId;
    const newCategoryId = dto.categoryId ? BigInt(dto.categoryId) : bill.categoryId;
    const tagIds = dto.tagIds?.map((tid) => BigInt(tid));

    if (dto.accountId || dto.categoryId) {
      await this.validateBillInput(userId, bill.ledgerId, newAccountId, newCategoryId);
    }
    if (tagIds !== undefined) {
      await this.validateTagIds(userId, bill.ledgerId, tagIds);
    }

    const newAmount = dto.amount ? new Prisma.Decimal(dto.amount) : bill.amount;
    const newType = dto.type ?? bill.type;

    await this.repo.getClient().$transaction(async (tx) => {
      // 反向旧账户余额
      const oldBalanceDelta = bill.type === 1 ? bill.amount : bill.amount.negated();
      await this.repo.updateAccount(tx, bill.accountId, oldBalanceDelta);

      // 应用新账户余额
      const newBalanceDelta = newType === 1 ? newAmount.negated() : newAmount;
      await this.repo.updateAccount(tx, newAccountId, newBalanceDelta);

      // 更新账单
      await this.repo.update(tx, id, {
        accountId: newAccountId,
        categoryId: newCategoryId,
        type: newType,
        amount: newAmount,
        remark: dto.remark !== undefined ? (dto.remark ?? null) : undefined,
        billDate: dto.billDate ? new Date(dto.billDate) : undefined,
      });

      // 更新标签
      if (tagIds !== undefined) {
        await this.repo.deleteBillTags(tx, id);
        if (tagIds.length > 0) {
          await this.repo.createBillTags(tx, id, tagIds);
        }
      }

      if (dto.categoryId) {
        await this.repo.updateCategoryLastUsedAt(tx, newCategoryId);
      }
    });

    const detail = await this.repo.findById(id);
    return serializeBill(detail!);
  }

  async remove(userId: bigint, id: bigint) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const bill = await this.repo.findById(id);
    if (!bill) throw new NotFoundException('账单不存在');
    if (bill.userId !== userId) throw new ForbiddenException('无权操作该账单');
    if (bill.ledgerId !== ledger.id) throw new ForbiddenException('无权操作该账单');

    await this.repo.getClient().$transaction(async (tx) => {
      // 反向账户余额
      const balanceDelta = bill.type === 1 ? bill.amount : bill.amount.negated();
      await this.repo.updateAccount(tx, bill.accountId, balanceDelta);

      await this.repo.softDelete(tx, id);
    });

    return { success: true };
  }

  async calendarSummary(userId: bigint, month: string) {
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const results = await this.repo.calendarSummary(userId, ledger.id, month);

    const map = new Map<string, { date: string; expenseAmount: string; incomeAmount: string }>();

    for (const item of results) {
      const dateKey = item.billDate.toISOString().slice(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: dateKey,
          expenseAmount: '0',
          incomeAmount: '0',
        });
      }
      const entry = map.get(dateKey)!;
      const sum = item._sum.amount?.toString() ?? '0';
      if (item.type === 1) {
        entry.expenseAmount = sum;
      } else if (item.type === 2) {
        entry.incomeAmount = sum;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}
