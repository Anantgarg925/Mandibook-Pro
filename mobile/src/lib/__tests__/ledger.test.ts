import { computeRunningBalances } from '@/lib/ledger';
import type { Transaction } from '@/types/inquiry';

function txn(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? String(Math.random()),
    type: partial.type ?? 'SALE',
    amount: partial.amount ?? 0,
    date: partial.date ?? Date.now(),
    createdAt: partial.createdAt ?? partial.date ?? Date.now(),
    ...partial,
  };
}

describe('computeRunningBalances', () => {
  it('returns newest first with running balances after sales and payments', () => {
    const rows = computeRunningBalances([
      txn({ id: 'sale-1', type: 'SALE', amount: 1000, date: 1 }),
      txn({ id: 'pay-1', type: 'PAYMENT', amount: 300, date: 2 }),
      txn({ id: 'sale-2', type: 'SALE', amount: 500, date: 3 }),
    ]);

    expect(rows.map((r) => r.id)).toEqual(['sale-2', 'pay-1', 'sale-1']);
    expect(rows.map((r) => r.balanceAfter)).toEqual([1200, 700, 1000]);
  });

  it('does not show negative buyer balance after overpayment', () => {
    const rows = computeRunningBalances([
      txn({ id: 'sale-1', type: 'SALE', amount: 100, date: 1 }),
      txn({ id: 'pay-1', type: 'PAYMENT', amount: 150, date: 2 }),
    ]);

    expect(rows[0].balanceAfter).toBe(0);
  });
});
