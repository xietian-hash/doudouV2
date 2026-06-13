import { AccountsService } from './accounts.service';
import { ForbiddenException } from '../../common/errors/business-error';

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    userId: 1n,
    ledgerId: 10n,
    name: '现金',
    type: 1,
    balance: { toString: () => '0' },
    icon: null,
    sort: 0,
    isDefault: 0,
    isDeleted: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AccountsService ledger isolation', () => {
  it('lists accounts from current default ledger only', async () => {
    const repo = {
      findAllByUserId: jest.fn().mockResolvedValue([account()]),
    };
    const ledgersService = {
      getOrCreateDefaultLedger: jest.fn().mockResolvedValue({ id: 10n }),
    };
    const service = new AccountsService(repo as never, ledgersService as never);

    const result = await service.list(1n);

    expect(repo.findAllByUserId).toHaveBeenCalledWith(1n, 10n);
    expect(result[0].ledgerId).toBe('10');
  });

  it('rejects update when account belongs to another ledger', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue(account({ ledgerId: 99n })),
    };
    const ledgersService = {
      getOrCreateDefaultLedger: jest.fn().mockResolvedValue({ id: 10n }),
    };
    const service = new AccountsService(repo as never, ledgersService as never);

    await expect(service.update(1n, 1n, { name: '银行卡' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
