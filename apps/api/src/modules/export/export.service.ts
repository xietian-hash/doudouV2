import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ExcelJS = require('exceljs');
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LedgersService } from '../ledgers/ledgers.service';

const ACCOUNT_TYPE_NAMES: Record<number, string> = {
  1: '现金',
  2: '银行卡',
  3: '支付宝',
  4: '微信',
  5: '其他',
};

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ledgersService: LedgersService,
  ) {}

  async exportBills(userId: bigint, email: string): Promise<void> {
    this.logger.log(`开始导出 userId=${userId} to=${email}`);

    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);

    const [bills, categories, accounts] = await Promise.all([
      this.prisma.bill.findMany({
        where: { userId, ledgerId: ledger.id, isDeleted: 0 },
        orderBy: [{ billDate: 'desc' }, { id: 'desc' }],
        include: {
          category: {
            select: {
              name: true,
              type: true,
              parent: { select: { name: true } },
            },
          },
          account: { select: { name: true } },
          billTags: {
            include: { tag: { select: { name: true } } },
          },
        },
      }),
      this.prisma.category.findMany({
        where: { userId, ledgerId: ledger.id, isDeleted: 0, parentId: { not: null } },
        include: { parent: { select: { name: true } } },
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.account.findMany({
        where: { userId, ledgerId: ledger.id, isDeleted: 0 },
        orderBy: [{ isDefault: 'desc' }, { sort: 'asc' }],
      }),
    ]);

    const buffer = await this.buildWorkbook(bills, categories, accounts);
    await this.sendEmail(email, buffer, bills.length);

    this.logger.log(`导出成功 userId=${userId} to=${email} bills=${bills.length}`);
  }

  private async buildWorkbook(
    bills: Array<{
      billDate: Date;
      type: number;
      amount: { toString(): string };
      remark: string | null;
      category: {
        name: string;
        type: number;
        parent: { name: string } | null;
      };
      account: { name: string } | null;
      billTags: Array<{ tag: { name: string } }>;
    }>,
    categories: Array<{
      name: string;
      type: number;
      parent: { name: string } | null;
    }>,
    accounts: Array<{
      name: string;
      type: number;
      balance: { toString(): string };
    }>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '兜兜有钱';
    workbook.created = new Date();

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAF7EF' },
    };

    // Sheet 1: 账单明细
    const billSheet = workbook.addWorksheet('账单明细');
    billSheet.columns = [
      { header: '日期', key: 'date', width: 14 },
      { header: '类型', key: 'type', width: 8 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '一级分类', key: 'parentCategory', width: 14 },
      { header: '二级分类', key: 'category', width: 14 },
      { header: '账户', key: 'account', width: 14 },
      { header: '备注', key: 'remark', width: 22 },
      { header: '标签', key: 'tag', width: 12 },
    ];
    billSheet.getRow(1).font = { bold: true };
    billSheet.getRow(1).fill = headerFill;

    for (const bill of bills) {
      const d = new Date(bill.billDate);
      const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      const isLeaf = bill.category.parent !== null;
      billSheet.addRow({
        date: dateStr,
        type: bill.type === 1 ? '支出' : '收入',
        amount: Number(bill.amount.toString()),
        parentCategory: isLeaf ? (bill.category.parent?.name ?? '') : bill.category.name,
        category: isLeaf ? bill.category.name : '',
        account: bill.account?.name ?? '',
        remark: bill.remark ?? '',
        tag: bill.billTags.map((bt) => bt.tag.name).join('、'),
      });
    }

    // Sheet 2: 分类列表
    const catSheet = workbook.addWorksheet('分类列表');
    catSheet.columns = [
      { header: '一级分类', key: 'parent', width: 14 },
      { header: '二级分类', key: 'name', width: 14 },
      { header: '类型', key: 'type', width: 8 },
    ];
    catSheet.getRow(1).font = { bold: true };
    catSheet.getRow(1).fill = headerFill;
    for (const c of categories) {
      catSheet.addRow({
        parent: c.parent?.name ?? '',
        name: c.name,
        type: c.type === 1 ? '支出' : '收入',
      });
    }

    // Sheet 3: 账户列表
    const accSheet = workbook.addWorksheet('账户列表');
    accSheet.columns = [
      { header: '账户名', key: 'name', width: 14 },
      { header: '类型', key: 'type', width: 10 },
      { header: '余额', key: 'balance', width: 14 },
    ];
    accSheet.getRow(1).font = { bold: true };
    accSheet.getRow(1).fill = headerFill;
    for (const a of accounts) {
      accSheet.addRow({
        name: a.name,
        type: ACCOUNT_TYPE_NAMES[a.type] ?? '其他',
        balance: Number(a.balance.toString()),
      });
    }

    const raw = await workbook.xlsx.writeBuffer();
    return Buffer.from(raw as ArrayBuffer);
  }

  private async sendEmail(to: string, buffer: Buffer, billCount: number): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      auth: {
        user: '1490581303@qq.com',
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const filename = `兜兜有钱-账单导出-${dateStr}.xlsx`;

    await transporter.sendMail({
      from: '兜兜有钱 <1490581303@qq.com>',
      to,
      subject: `兜兜有钱 · 账单数据导出 ${dateStr}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a2e23;">
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1a2e23;">兜兜有钱</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#6b8f7a;">你的账单数据已准备好</p>
          <div style="padding:20px 24px;background:#f0fbf5;border-radius:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:15px;line-height:1.7;color:#2d5a3d;">
              附件 <strong>${filename}</strong> 共包含 <strong>${billCount}</strong> 条账单，内容如下：
            </p>
            <ul style="margin:12px 0 0;padding-left:20px;font-size:14px;color:#4a7a5e;line-height:2;">
              <li>账单明细</li>
              <li>分类列表</li>
              <li>账户列表</li>
            </ul>
          </div>
          <p style="margin:0;font-size:13px;color:#9bb5a5;line-height:1.6;">
            若未收到邮件，请检查垃圾邮件文件夹。<br/>此邮件由系统自动发送，请勿直接回复。
          </p>
        </div>
      `,
      attachments: [
        {
          filename,
          content: buffer,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });
  }
}
