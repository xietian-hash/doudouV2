import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request = require('supertest');
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { cleanupUserData, createTestUser } from './test-utils/prisma-cleanup';

class TestAuthGuard implements CanActivate {
  constructor(private readonly getUser: () => { id: bigint; openid: string }) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = this.getUser();
    return true;
  }
}

describe('ledger scoped API', () => {
  const prisma = new PrismaClient();
  let app: INestApplication;
  let userId: bigint;
  let openid: string;
  let defaultLedgerId: bigint;
  let otherLedgerId: bigint;
  let accountId: bigint;
  let categoryId: bigint;

  beforeAll(async () => {
    const user = await createTestUser(prisma, 'jest-api');
    userId = user.id;
    openid = user.openid;

    const defaultLedger = await prisma.ledger.create({
      data: {
        userId,
        name: '日常账本',
        sceneType: 'personal',
        isDefault: 1,
      },
    });
    defaultLedgerId = defaultLedger.id;
    const otherLedger = await prisma.ledger.create({
      data: {
        userId,
        name: '公司账本',
        sceneType: 'company',
        isDefault: 0,
      },
    });
    otherLedgerId = otherLedger.id;

    const account = await prisma.account.create({
      data: {
        userId,
        ledgerId: defaultLedgerId,
        name: '接口测试账户',
        type: 1,
        balance: 0,
        isDefault: 1,
      },
    });
    accountId = account.id;

    const category = await prisma.category.create({
      data: {
        userId,
        ledgerId: defaultLedgerId,
        name: '接口测试分类',
        type: 1,
        sort: 1,
        parentId: null,
      },
    });
    categoryId = category.id;

    await prisma.account.create({
      data: {
        userId,
        ledgerId: otherLedgerId,
        name: '不应返回账户',
        type: 1,
        balance: 0,
        isDefault: 0,
      },
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new TestAuthGuard(() => ({ id: userId, openid })))
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (userId) {
      await cleanupUserData(prisma, userId);
    }
    await prisma.$disconnect();
  });

  it('returns accounts from default ledger only', async () => {
    const response = await request(app.getHttpServer()).get('/api/accounts').expect(200);

    expect(response.body.code).toBe(0);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        id: accountId.toString(),
        ledgerId: defaultLedgerId.toString(),
        name: '接口测试账户',
      }),
    );
  });

  it('creates bills under default ledger and returns ledgerId', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/bills')
      .send({
        accountId: accountId.toString(),
        categoryId: categoryId.toString(),
        type: 1,
        amount: 12.5,
        billDate: '2026-06-13',
        remark: '接口测试账单',
      })
      .expect(201);

    expect(response.body.code).toBe(0);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        ledgerId: defaultLedgerId.toString(),
        accountId: accountId.toString(),
        categoryId: categoryId.toString(),
        remark: '接口测试账单',
      }),
    );
  });

  it('does not expose bills from another ledger', async () => {
    await prisma.bill.create({
      data: {
        userId,
        ledgerId: otherLedgerId,
        accountId,
        categoryId,
        type: 1,
        amount: 99,
        billDate: new Date('2026-06-13T00:00:00.000Z'),
        source: 1,
        remark: '不应返回账单',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/api/bills')
      .query({ pageNo: 1, pageSize: 20 })
      .expect(200);

    expect(response.body.code).toBe(0);
    expect(response.body.data.list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ledgerId: defaultLedgerId.toString(),
          remark: '接口测试账单',
        }),
      ]),
    );
    expect(response.body.data.list).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ remark: '不应返回账单' })]),
    );
  });

  it('returns economic indicators from income and economic expense tags', async () => {
    const incomeCategory = await prisma.category.create({
      data: {
        userId,
        ledgerId: defaultLedgerId,
        name: '指标收入分类',
        type: 2,
        sort: 1,
        parentId: null,
      },
    });
    await prisma.bill.create({
      data: {
        userId,
        ledgerId: defaultLedgerId,
        accountId,
        categoryId: incomeCategory.id,
        type: 2,
        amount: 1000,
        billDate: new Date('2026-06-13T00:00:00.000Z'),
        source: 1,
      },
    });

    const rows = [
      ['餐饮必要', 100],
      ['居住刚性', 200],
      ['生活必要', 100],
      ['债务还款', 50],
      ['可选消费', 150],
      ['转账投资', 200],
    ] as const;

    for (const [tagName, amount] of rows) {
      const tag = await prisma.tag.create({
        data: {
          userId,
          ledgerId: defaultLedgerId,
          name: tagName,
          tagType: 'economic',
          canEdit: 0,
          canDelete: 0,
        },
      });
      const category = await prisma.category.create({
        data: {
          userId,
          ledgerId: defaultLedgerId,
          name: `指标-${tagName}`,
          type: 1,
          sort: 1,
          parentId: null,
        },
      });
      await prisma.categoryTag.create({
        data: { categoryId: category.id, tagId: tag.id },
      });
      await prisma.bill.create({
        data: {
          userId,
          ledgerId: defaultLedgerId,
          accountId,
          categoryId: category.id,
          type: 1,
          amount,
          billDate: new Date('2026-06-13T00:00:00.000Z'),
          source: 1,
        },
      });
    }

    const response = await request(app.getHttpServer())
      .get('/api/statistics/overview')
      .query({ period: 'month', month: '2026-06', type: 1, level: 2 })
      .expect(200);

    const indicators = Object.fromEntries(
      response.body.data.economicIndicators.map((item: { key: string; value: number }) => [
        item.key,
        item.value,
      ]),
    );

    expect(indicators).toEqual(
      expect.objectContaining({
        engel: 10,
        rigidLiving: 30,
        debtRepayment: 5,
        optionalConsumption: 15,
        savingsRate: 40,
      }),
    );
  });

  it('returns summary year-over-year and period-over-period comparisons', async () => {
    await prisma.bill.createMany({
      data: [
        {
          userId,
          ledgerId: defaultLedgerId,
          accountId,
          categoryId,
          type: 1,
          amount: 406.25,
          billDate: new Date('2026-05-13T00:00:00.000Z'),
          source: 1,
        },
        {
          userId,
          ledgerId: defaultLedgerId,
          accountId,
          categoryId,
          type: 1,
          amount: 1625,
          billDate: new Date('2025-06-13T00:00:00.000Z'),
          source: 1,
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get('/api/statistics/overview')
      .query({ period: 'month', month: '2026-06', type: 1, level: 2 })
      .expect(200);

    expect(response.body.data.summary).toEqual(
      expect.objectContaining({
        total: '812.50',
        periodOverPeriod: {
          label: '环比',
          amount: '406.25',
          changePercent: 100,
        },
        yearOverYear: {
          label: '同比',
          amount: '1625.00',
          changePercent: -50,
        },
      }),
    );
  });
});
