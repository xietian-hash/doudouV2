import { Injectable } from '@nestjs/common';
import ExcelJS = require('exceljs');
import { CategoriesRepo } from '../categories/categories.repo';
import { AccountsRepo } from '../accounts/accounts.repo';
import { TagsRepo } from '../tags/tags.repo';

const HEADER_ROW = ['日期', '类型', '金额', '二级分类', '账户名', '备注', '标签'];

@Injectable()
export class ImportTemplateService {
  constructor(
    private readonly categoriesRepo: CategoriesRepo,
    private readonly accountsRepo: AccountsRepo,
    private readonly tagsRepo: TagsRepo,
  ) {}

  async generateTemplate(userId: bigint): Promise<Buffer> {
    const [leafCategories, accounts, tags] = await Promise.all([
      this.categoriesRepo.findLeafCategories(userId),
      this.accountsRepo.findAllByUserId(userId),
      this.tagsRepo.findAllByUserId(userId),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '兜兜有钱';
    workbook.created = new Date();

    // Sheet 1: 账单数据
    const dataSheet = workbook.addWorksheet('账单数据');
    dataSheet.columns = [
      { header: '日期', key: 'date', width: 14 },
      { header: '类型', key: 'type', width: 8 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '二级分类', key: 'category', width: 14 },
      { header: '账户名', key: 'account', width: 14 },
      { header: '备注', key: 'remark', width: 22 },
      { header: '标签', key: 'tag', width: 12 },
    ];

    // 表头加粗
    dataSheet.getRow(1).font = { bold: true };
    dataSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAF7EF' },
    };

    // 添加 3 行示例，并标黄色提示删除
    const sampleCategoryExpense = leafCategories.find((c) => c.type === 1)?.name ?? '早餐';
    const sampleCategoryIncome = leafCategories.find((c) => c.type === 2)?.name ?? '工资';
    const sampleAccount = accounts[0]?.name ?? '现金';
    const sampleTag = tags[0]?.name ?? '';

    const now = new Date();
    const today = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    const samples = [
      { date: today, type: '支出', amount: 35.0, category: sampleCategoryExpense, account: sampleAccount, remark: '示例：午餐', tag: sampleTag },
      { date: today, type: '支出', amount: 12.5, category: sampleCategoryExpense, account: sampleAccount, remark: '示例：早餐', tag: '' },
      { date: today, type: '收入', amount: 5000, category: sampleCategoryIncome, account: sampleAccount, remark: '示例：工资', tag: '' },
    ];

    samples.forEach((row) => dataSheet.addRow(row));

    // 示例行用浅黄色标记，提示用户记得删除
    for (let i = 2; i <= 4; i++) {
      dataSheet.getRow(i).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF8E1' },
      };
    }

    // Sheet 2: 合法值清单
    const referenceSheet = workbook.addWorksheet('合法值清单');
    referenceSheet.getCell('A1').value = '二级分类（支出）';
    referenceSheet.getCell('B1').value = '二级分类（收入）';
    referenceSheet.getCell('C1').value = '账户名';
    referenceSheet.getCell('D1').value = '标签';
    referenceSheet.getRow(1).font = { bold: true };
    referenceSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAF7EF' },
    };
    referenceSheet.columns = [
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
    ];

    const expenseLeafs = leafCategories.filter((c) => c.type === 1);
    const incomeLeafs = leafCategories.filter((c) => c.type === 2);
    const maxRows = Math.max(expenseLeafs.length, incomeLeafs.length, accounts.length, tags.length);
    for (let i = 0; i < maxRows; i++) {
      referenceSheet.getCell(`A${i + 2}`).value = expenseLeafs[i]?.name ?? '';
      referenceSheet.getCell(`B${i + 2}`).value = incomeLeafs[i]?.name ?? '';
      referenceSheet.getCell(`C${i + 2}`).value = accounts[i]?.name ?? '';
      referenceSheet.getCell(`D${i + 2}`).value = tags[i]?.name ?? '';
    }

    // Sheet 3: 使用说明
    const helpSheet = workbook.addWorksheet('使用说明');
    helpSheet.columns = [{ width: 90 }];
    helpSheet.getCell('A1').value = '兜兜有钱 · 账单批量导入说明';
    helpSheet.getCell('A1').font = { bold: true, size: 14 };
    const helps = [
      '',
      '1. 第一个 sheet「账单数据」用于填写账单：第 1 行为字段名，请勿修改；第 2-4 行为示例，导入前请删除。',
      '2. 字段规则：',
      '   - 日期：格式 YYYY/MM/DD（也兼容 YYYY-MM-DD），必填',
      '   - 类型：仅支持「支出」或「收入」，必填',
      '   - 金额：大于 0 的数字，最多 2 位小数，必填',
      '   - 二级分类：必须与「合法值清单」sheet 中的二级分类名称完全一致，必填',
      '   - 账户名：必须与「合法值清单」sheet 中的账户名完全一致，必填',
      '   - 备注：最长 100 字，可空',
      '   - 标签：必须与「合法值清单」sheet 中的标签名完全一致，可空',
      '3. 单次最多导入 10000 条数据。',
      '4. 任意一行校验失败 → 整批不入账。系统会生成错误清单 Excel 供您下载查看具体原因。',
      '5. 重复账单（同用户 + 日期 + 金额 + 分类 + 账户 + 备注）自动跳过。',
      '6. 如需新增二级分类、账户或标签，请先在小程序内创建后再下载新的模板。',
    ];
    helps.forEach((line, idx) => {
      helpSheet.getCell(`A${idx + 2}`).value = line;
      helpSheet.getCell(`A${idx + 2}`).alignment = { wrapText: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }
}

export const TEMPLATE_HEADER_ROW = HEADER_ROW;
