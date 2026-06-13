import { BillsService } from './bills.service';
import { ForbiddenException } from '../../common/errors/business-error';

function bill(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    userId: 1n,
    ledgerId: 20n,
    accountId: 1n,
    categoryId: 1n,
    type: 1,
    amount: { toString: () => '12.00', negated: jest.fn() },
    remark: null,
    billDate: new Date('2026-06-13T00:00:00.000Z'),
    source: 1,
    voiceText: null,
    isDeleted: 0,
    createdAt: new Date('2026-06-13T00:00:00.000Z'),
    updatedAt: new Date('2026-06-13T00:00:00.000Z'),
    ...overrides,
  };
}

describe('BillsService ledger isolation', () => {
  it('passes current default ledger to list query', async () => {
    const repo = {
      findAll: jest.fn().mockResolvedValue({ total: 0, bills: [] }),
    };
    const service = new BillsService(
      repo as never,
      {} as never,
      {} as never,
      { getOrCreateDefaultLedger: jest.fn().mockResolvedValue({ id: 20n }) } as never,
      {} as never,
    );

    await service.list(1n, { pageNo: 1, pageSize: 20 });

    expect(repo.findAll).toHaveBeenCalledWith(
      1n,
      20n,
      expect.objectContaining({ pageNo: 1, pageSize: 20 }),
    );
  });

  it('rejects reading a bill from another ledger', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue(bill({ ledgerId: 99n })),
    };
    const service = new BillsService(
      repo as never,
      {} as never,
      {} as never,
      { getOrCreateDefaultLedger: jest.fn().mockResolvedValue({ id: 20n }) } as never,
      {} as never,
    );

    await expect(service.findOne(1n, 1n)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
