import { PrismaClient } from '@prisma/client';

export async function cleanupUserData(prisma: PrismaClient, userId: bigint) {
  await prisma.billTag.deleteMany({
    where: {
      OR: [{ bill: { userId } }, { tag: { userId } }],
    },
  });
  await prisma.categoryTag.deleteMany({
    where: {
      OR: [{ category: { userId } }, { tag: { userId } }],
    },
  });
  await prisma.bill.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.tag.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.ledger.deleteMany({ where: { userId } });
  await prisma.feedback.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

export async function createTestUser(prisma: PrismaClient, prefix: string) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return prisma.user.create({
    data: {
      openid: `${prefix}-${suffix}`,
      nickname: '测试用户',
      status: 1,
    },
  });
}
