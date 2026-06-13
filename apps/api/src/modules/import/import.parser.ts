import { Injectable } from '@nestjs/common';
import ExcelJS = require('exceljs');
import { CategoriesRepo } from '../categories/categories.repo';
import { AccountsRepo } from '../accounts/accounts.repo';
import { TagsRepo } from '../tags/tags.repo';
import { LedgersService } from '../ledgers/ledgers.service';

export interface ParsedBillRow {
  // 原始字段（用于错误清单回写）
  rawDate: string;
  rawType: string;
  rawAmount: string;
  rawCategory: string;
  rawAccount: string;
  rawRemark: string;
  rawTag: string;
  rowNumber: number;
  // 解析后字段（仅 valid 才有）
  date?: Date;
  type?: number; // 1=支出, 2=收入
  amount?: string;
  categoryId?: bigint;
  accountId?: bigint;
  tagId?: bigint | null;
  remark?: string | null;
  // 错误原因（仅 invalid 才有）
  errorReason?: string;
}

export interface ParseResult {
  totalRows: number;
  validRows: ParsedBillRow[];
  invalidRows: ParsedBillRow[];
  headerInvalid: boolean;
}

const EXPECTED_HEADERS = ['日期', '类型', '金额', '二级分类', '账户名', '备注', '标签'];
const MAX_ROWS = 10000;
const MAX_REMARK_LEN = 100;

@Injectable()
export class ImportParserService {
  constructor(
    private readonly categoriesRepo: CategoriesRepo,
    private readonly accountsRepo: AccountsRepo,
    private readonly tagsRepo: TagsRepo,
    private readonly ledgersService: LedgersService,
  ) {}

  async parseAndValidate(userId: bigint, filePath: string): Promise<ParseResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return { totalRows: 0, validRows: [], invalidRows: [], headerInvalid: true };
    }

    // 校验表头
    const headerRow = sheet.getRow(1);
    const actualHeaders: string[] = [];
    for (let col = 1; col <= EXPECTED_HEADERS.length; col++) {
      const cell = headerRow.getCell(col);
      actualHeaders.push(String(cell.value ?? '').trim());
    }
    const headerInvalid = !EXPECTED_HEADERS.every((h, i) => actualHeaders[i] === h);
    if (headerInvalid) {
      return { totalRows: 0, validRows: [], invalidRows: [], headerInvalid: true };
    }

    // 预加载校验数据
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const [leafCategories, accounts, tags] = await Promise.all([
      this.categoriesRepo.findLeafCategories(userId, undefined, ledger.id),
      this.accountsRepo.findAllByUserId(userId, ledger.id),
      this.tagsRepo.findAllByUserId(userId, ledger.id),
    ]);
    const categoryByName = new Map(leafCategories.map((c) => [c.name, c]));
    const accountByName = new Map(accounts.map((a) => [a.name, a]));
    const tagByName = new Map(tags.map((t) => [t.name, t]));

    const validRows: ParsedBillRow[] = [];
    const invalidRows: ParsedBillRow[] = [];
    let totalRows = 0;

    // 从第 2 行开始遍历
    const lastRow = sheet.lastRow?.number ?? 1;
    for (let rowIdx = 2; rowIdx <= lastRow; rowIdx++) {
      const row = sheet.getRow(rowIdx);
      const rawDate = this.readCellAsString(row.getCell(1));
      const rawType = this.readCellAsString(row.getCell(2));
      const rawAmount = this.readCellAsString(row.getCell(3));
      const rawCategory = this.readCellAsString(row.getCell(4));
      const rawAccount = this.readCellAsString(row.getCell(5));
      const rawRemark = this.readCellAsString(row.getCell(6));
      const rawTag = this.readCellAsString(row.getCell(7));

      // 整行为空，跳过
      const isEmpty =
        !rawDate && !rawType && !rawAmount && !rawCategory && !rawAccount && !rawRemark && !rawTag;
      if (isEmpty) continue;

      totalRows++;

      const parsed: ParsedBillRow = {
        rawDate,
        rawType,
        rawAmount,
        rawCategory,
        rawAccount,
        rawRemark,
        rawTag,
        rowNumber: rowIdx,
      };

      // 超出最大行数
      if (totalRows > MAX_ROWS) {
        parsed.errorReason = `数据行数超过上限（${MAX_ROWS} 条），请分批导入`;
        invalidRows.push(parsed);
        continue;
      }

      const errors: string[] = [];

      // 日期
      const date = this.parseDate(rawDate);
      if (!date) {
        errors.push('日期格式错误，请使用 YYYY/MM/DD 或 YYYY-MM-DD');
      } else {
        parsed.date = date;
      }

      // 类型
      if (rawType === '支出') parsed.type = 1;
      else if (rawType === '收入') parsed.type = 2;
      else errors.push('类型只能是「支出」或「收入」');

      // 金额
      const amountNum = Number(rawAmount);
      if (!rawAmount || Number.isNaN(amountNum) || amountNum <= 0) {
        errors.push('金额必须是大于 0 的数字');
      } else if (amountNum > 99999999) {
        errors.push('金额过大');
      } else {
        // 截断到 2 位小数
        parsed.amount = (Math.round(amountNum * 100) / 100).toFixed(2);
      }

      // 二级分类
      if (!rawCategory) {
        errors.push('二级分类不能为空');
      } else {
        const cat = categoryByName.get(rawCategory);
        if (!cat) {
          errors.push(`二级分类「${rawCategory}」不存在，请到小程序内创建或参考「合法值清单」`);
        } else if (parsed.type && cat.type !== parsed.type) {
          errors.push(
            `二级分类「${rawCategory}」属于${cat.type === 1 ? '支出' : '收入'}，与「${rawType}」不匹配`,
          );
        } else {
          parsed.categoryId = cat.id;
        }
      }

      // 账户
      if (!rawAccount) {
        errors.push('账户名不能为空');
      } else {
        const acc = accountByName.get(rawAccount);
        if (!acc) {
          errors.push(`账户「${rawAccount}」不存在，请到小程序内创建或参考「合法值清单」`);
        } else {
          parsed.accountId = acc.id;
        }
      }

      // 备注
      if (rawRemark && rawRemark.length > MAX_REMARK_LEN) {
        errors.push(`备注最长 ${MAX_REMARK_LEN} 字`);
      } else {
        parsed.remark = rawRemark || null;
      }

      // 标签（可空）
      if (rawTag) {
        const tag = tagByName.get(rawTag);
        if (!tag) {
          errors.push(`标签「${rawTag}」不存在，请到小程序内创建或参考「合法值清单」`);
        } else {
          parsed.tagId = tag.id;
        }
      } else {
        parsed.tagId = null;
      }

      if (errors.length > 0) {
        parsed.errorReason = errors.join('；');
        invalidRows.push(parsed);
      } else {
        validRows.push(parsed);
      }
    }

    return { totalRows, validRows, invalidRows, headerInvalid: false };
  }

  /** 生成错误清单 Excel，返回 buffer */
  async buildErrorWorkbook(invalidRows: ParsedBillRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('错误清单');
    sheet.columns = [
      { header: '行号', key: 'row', width: 8 },
      { header: '日期', key: 'date', width: 14 },
      { header: '类型', key: 'type', width: 8 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '二级分类', key: 'category', width: 14 },
      { header: '账户名', key: 'account', width: 14 },
      { header: '备注', key: 'remark', width: 22 },
      { header: '标签', key: 'tag', width: 12 },
      { header: '失败原因', key: 'reason', width: 60 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE5E5' },
    };

    for (const r of invalidRows) {
      sheet.addRow({
        row: r.rowNumber,
        date: r.rawDate,
        type: r.rawType,
        amount: r.rawAmount,
        category: r.rawCategory,
        account: r.rawAccount,
        remark: r.rawRemark,
        tag: r.rawTag,
        reason: r.errorReason ?? '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  private readCellAsString(cell: ExcelJS.Cell): string {
    const v = cell.value;
    if (v == null) return '';
    if (v instanceof Date) {
      // Excel 日期类型 → YYYY-MM-DD（按本地时区年月日，避免 UTC 偏一天）
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, '0');
      const d = String(v.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof v === 'object' && 'text' in (v as object)) {
      return String((v as { text: string }).text || '').trim();
    }
    if (typeof v === 'object' && 'result' in (v as object)) {
      return String((v as { result: unknown }).result ?? '').trim();
    }
    return String(v).trim();
  }

  private parseDate(s: string): Date | null {
    if (!s) return null;
    // 支持 YYYY-MM-DD 或 YYYY/MM/DD
    const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    // 使用 UTC 0 点，与手工记账（new Date("YYYY-MM-DD")）的日期语义对齐，
    // 避免下游 toISOString().slice(0,10) 在东八区偏一天
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date;
  }
}
