import { LedgersService } from './ledgers.service';

describe('LedgersService', () => {
  it('returns existing default ledger when one exists', async () => {
    const ledger = {
      id: 10n,
      userId: 1n,
      name: '日常账本',
      sceneType: 'personal',
      isDefault: 1,
      isDeleted: 0,
    };
    const prisma = {
      ledger: {
        findFirst: jest.fn().mockResolvedValue(ledger),
        create: jest.fn(),
      },
    };

    const result = await new LedgersService(prisma as never).getOrCreateDefaultLedger(1n);

    expect(result).toBe(ledger);
    expect(prisma.ledger.findFirst).toHaveBeenCalledWith({
      where: { userId: 1n, isDeleted: 0, isDefault: 1 },
      orderBy: { id: 'asc' },
    });
    expect(prisma.ledger.create).not.toHaveBeenCalled();
  });

  it('creates default ledger when none exists', async () => {
    const created = {
      id: 11n,
      userId: 2n,
      name: '日常账本',
      sceneType: 'personal',
      isDefault: 1,
      isDeleted: 0,
    };
    const prisma = {
      ledger: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    };

    const result = await new LedgersService(prisma as never).getOrCreateDefaultLedger(2n);

    expect(result).toBe(created);
    expect(prisma.ledger.create).toHaveBeenCalledWith({
      data: {
        userId: 2n,
        name: '日常账本',
        sceneType: 'personal',
        isDefault: 1,
      },
    });
  });
});
