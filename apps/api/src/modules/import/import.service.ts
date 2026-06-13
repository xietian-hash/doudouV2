import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { join } from 'path';
import { mkdirSync, writeFileSync, existsSync, readdirSync, unlinkSync, statSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportTemplateService } from './import.template';
import { ImportParserService, ParsedBillRow } from './import.parser';
import { LedgersService } from '../ledgers/ledgers.service';

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  skipDuplicateCount: number;
  errorCount: number;
  errorFileUrl?: string;
  message: string;
}

const ERROR_DIR_RELATIVE = 'errors';
const ERROR_RETENTION_HOURS = 24;
const BILL_SOURCE_IMPORT = 3;

@Injectable()
export class ImportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportService.name);
  private readonly uploadsRoot = join(process.cwd(), 'uploads');
  private readonly errorDir = join(this.uploadsRoot, ERROR_DIR_RELATIVE);
  private cleanTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly templateService: ImportTemplateService,
    private readonly parserService: ImportParserService,
    private readonly ledgersService: LedgersService,
  ) {
    mkdirSync(this.errorDir, { recursive: true });
  }

  onModuleInit() {
    // 启动时清理一次，之后每小时一次
    this.cleanExpiredErrorFiles();
    this.cleanTimer = setInterval(() => this.cleanExpiredErrorFiles(), 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanTimer) {
      clearInterval(this.cleanTimer);
      this.cleanTimer = undefined;
    }
  }

  async getTemplate(userId: bigint): Promise<Buffer> {
    return this.templateService.generateTemplate(userId);
  }

  async importBills(userId: bigint, filePath: string): Promise<ImportResult> {
    this.logger.log(`开始导入 userId=${userId} file=${filePath}`);

    const parse = await this.parserService.parseAndValidate(userId, filePath);

    // 表头错误
    if (parse.headerInvalid) {
      return {
        success: false,
        totalRows: 0,
        successCount: 0,
        skipDuplicateCount: 0,
        errorCount: 0,
        message: 'Excel 表头与模板不一致，请使用最新模板',
      };
    }

    // 整批拒绝：任一行错就生成错误清单
    if (parse.invalidRows.length > 0) {
      const errorUrl = await this.writeErrorFile(userId, parse.invalidRows);
      this.logger.warn(
        `导入校验失败 userId=${userId} total=${parse.totalRows} invalid=${parse.invalidRows.length}`,
      );
      return {
        success: false,
        totalRows: parse.totalRows,
        successCount: 0,
        skipDuplicateCount: 0,
        errorCount: parse.invalidRows.length,
        errorFileUrl: errorUrl,
        message: `共 ${parse.totalRows} 条数据，其中 ${parse.invalidRows.length} 条校验失败，请下载错误清单查看`,
      };
    }

    // 没有任何数据行
    if (parse.validRows.length === 0) {
      return {
        success: false,
        totalRows: 0,
        successCount: 0,
        skipDuplicateCount: 0,
        errorCount: 0,
        message: '未读取到任何账单数据，请检查 Excel 是否填写',
      };
    }

    // 去重
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const { uniqueRows, duplicateCount } = await this.dedupe(userId, ledger.id, parse.validRows);

    // 全部都是重复
    if (uniqueRows.length === 0) {
      return {
        success: true,
        totalRows: parse.totalRows,
        successCount: 0,
        skipDuplicateCount: duplicateCount,
        errorCount: 0,
        message: `共 ${parse.totalRows} 条数据，全部为重复账单，已自动跳过`,
      };
    }

    // 批量入账
    await this.batchInsert(userId, ledger.id, uniqueRows);

    this.logger.log(
      `导入成功 userId=${userId} total=${parse.totalRows} success=${uniqueRows.length} skip=${duplicateCount}`,
    );

    return {
      success: true,
      totalRows: parse.totalRows,
      successCount: uniqueRows.length,
      skipDuplicateCount: duplicateCount,
      errorCount: 0,
      message:
        duplicateCount > 0
          ? `导入成功 ${uniqueRows.length} 条，跳过重复 ${duplicateCount} 条`
          : `导入成功 ${uniqueRows.length} 条`,
    };
  }

  /** 清理过期错误清单文件，由调度器触发 */
  cleanExpiredErrorFiles(): number {
    if (!existsSync(this.errorDir)) return 0;
    const now = Date.now();
    const threshold = ERROR_RETENTION_HOURS * 60 * 60 * 1000;
    let removed = 0;
    try {
      const files = readdirSync(this.errorDir);
      for (const f of files) {
        const fp = join(this.errorDir, f);
        const stat = statSync(fp);
        if (now - stat.mtimeMs > threshold) {
          unlinkSync(fp);
          removed++;
        }
      }
    } catch (err) {
      this.logger.warn(`清理过期错误清单异常: ${(err as Error).message}`);
    }
    if (removed > 0) {
      this.logger.log(`已清理过期错误清单 ${removed} 个`);
    }
    return removed;
  }

  private async writeErrorFile(userId: bigint, invalidRows: ParsedBillRow[]): Promise<string> {
    const buffer = await this.parserService.buildErrorWorkbook(invalidRows);
    const fileName = `import-errors-${userId}-${Date.now()}-${uuidv4().slice(0, 8)}.xlsx`;
    const filePath = join(this.errorDir, fileName);
    writeFileSync(filePath, buffer);

    const serverBase = this.configService.get<string>('SERVER_BASE_URL') ?? 'http://localhost:3000';
    return `${serverBase}/uploads/${ERROR_DIR_RELATIVE}/${fileName}`;
  }

  private async dedupe(
    userId: bigint,
    ledgerId: bigint,
    rows: ParsedBillRow[],
  ): Promise<{ uniqueRows: ParsedBillRow[]; duplicateCount: number }> {
    const dates = rows.map((r) => r.date!).sort((a, b) => a.getTime() - b.getTime());
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    const existing = await this.prisma.bill.findMany({
      where: {
        userId,
        ledgerId,
        isDeleted: 0,
        billDate: { gte: minDate, lte: maxDate },
      },
      select: {
        billDate: true,
        amount: true,
        categoryId: true,
        accountId: true,
        remark: true,
      },
    });

    const existingKeys = new Set(
      existing.map((b) =>
        makeBillKey(b.billDate, b.amount.toString(), b.categoryId, b.accountId, b.remark),
      ),
    );

    const uniqueRows: ParsedBillRow[] = [];
    let duplicateCount = 0;
    // 用于去重导入文件内部的重复
    const seenInBatch = new Set<string>();

    for (const r of rows) {
      const key = makeBillKey(r.date!, r.amount!, r.categoryId!, r.accountId!, r.remark ?? null);
      if (existingKeys.has(key) || seenInBatch.has(key)) {
        duplicateCount++;
      } else {
        seenInBatch.add(key);
        uniqueRows.push(r);
      }
    }

    return { uniqueRows, duplicateCount };
  }

  private async batchInsert(
    userId: bigint,
    ledgerId: bigint,
    rows: ParsedBillRow[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. 批量插入无 tag 行
      const noTagRows = rows.filter((r) => !r.tagId);
      if (noTagRows.length > 0) {
        await tx.bill.createMany({
          data: noTagRows.map((r) => ({
            userId,
            ledgerId,
            accountId: r.accountId!,
            categoryId: r.categoryId!,
            type: r.type!,
            amount: new Prisma.Decimal(r.amount!),
            billDate: r.date!,
            remark: r.remark ?? null,
            source: BILL_SOURCE_IMPORT,
          })),
        });
      }

      // 2. 有 tag 的行单独 create + 关联 BillTag
      const tagRows = rows.filter((r) => r.tagId);
      for (const r of tagRows) {
        const bill = await tx.bill.create({
          data: {
            userId,
            ledgerId,
            accountId: r.accountId!,
            categoryId: r.categoryId!,
            type: r.type!,
            amount: new Prisma.Decimal(r.amount!),
            billDate: r.date!,
            remark: r.remark ?? null,
            source: BILL_SOURCE_IMPORT,
          },
        });
        await tx.billTag.create({
          data: { billId: bill.id, tagId: r.tagId! },
        });
      }

      // 3. 更新账户余额（按账户聚合）
      const accountDelta = new Map<string, Prisma.Decimal>();
      for (const r of rows) {
        const amount = new Prisma.Decimal(r.amount!);
        const delta = r.type === 1 ? amount.negated() : amount;
        const key = r.accountId!.toString();
        const cur = accountDelta.get(key) ?? new Prisma.Decimal(0);
        accountDelta.set(key, cur.plus(delta));
      }
      for (const [accountIdStr, delta] of accountDelta) {
        await tx.account.update({
          where: { id: BigInt(accountIdStr) },
          data: { balance: { increment: delta } },
        });
      }

      // 4. 更新分类 lastUsedAt
      const categoryIds = Array.from(new Set(rows.map((r) => r.categoryId!.toString())));
      if (categoryIds.length > 0) {
        await tx.category.updateMany({
          where: { id: { in: categoryIds.map((id) => BigInt(id)) } },
          data: { lastUsedAt: new Date() },
        });
      }
    });
  }
}

function makeBillKey(
  date: Date,
  amount: string,
  categoryId: bigint,
  accountId: bigint,
  remark: string | null,
): string {
  const d = date.toISOString().slice(0, 10);
  const a = Number(amount).toFixed(2);
  return `${d}|${a}|${categoryId.toString()}|${accountId.toString()}|${remark ?? ''}`;
}
