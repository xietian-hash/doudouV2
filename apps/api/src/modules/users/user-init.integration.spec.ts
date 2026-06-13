import { PrismaClient } from '@prisma/client';
import { seedUserData } from '../../../prisma/seed';
import { cleanupUserData, createTestUser } from '../../test-utils/prisma-cleanup';

describe('user initialization ledger integration', () => {
  const prisma = new PrismaClient();
  let userId: bigint;

  beforeAll(async () => {
    const user = await createTestUser(prisma, 'jest-user-init');
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await cleanupUserData(prisma, userId);
    }
    await prisma.$disconnect();
  });

  it('creates a default ledger and binds seeded data to it', async () => {
    await seedUserData(prisma, userId);

    const ledger = await prisma.ledger.findFirstOrThrow({
      where: { userId, isDefault: 1, isDeleted: 0 },
    });

    expect(ledger.name).toBe('日常账本');
    expect(ledger.sceneType).toBe('personal');

    const [accountsMissing, categoriesMissing, tagsMissing] = await Promise.all([
      prisma.account.count({ where: { userId, ledgerId: { not: ledger.id } } }),
      prisma.category.count({ where: { userId, ledgerId: { not: ledger.id } } }),
      prisma.tag.count({ where: { userId, ledgerId: { not: ledger.id } } }),
    ]);

    expect(accountsMissing).toBe(0);
    expect(categoriesMissing).toBe(0);
    expect(tagsMissing).toBe(0);

    await expect(
      prisma.tag.findFirstOrThrow({
        where: { userId, ledgerId: ledger.id, tagType: 'economic', canEdit: 0, canDelete: 0 },
      }),
    ).resolves.toBeTruthy();
  });
});
