import type { Transaction } from '@/types/inquiry';

export type EnrichedTransaction = Transaction & { balanceAfter: number };

export function computeRunningBalances(transactions: Transaction[]): EnrichedTransaction[] {
  const sorted = [...transactions].sort((a, b) => a.date - b.date);
  let running = 0;
  const withBalance = sorted.map((txn) => {
    if (txn.type === 'SALE') {
      running += txn.amount;
    } else if (txn.type === 'OPENING') {
      running += txn.note === 'CR' ? -txn.amount : txn.amount;
    } else {
      running -= txn.amount;
    }
    return { ...txn, balanceAfter: Math.max(0, running) };
  });
  return withBalance.reverse();
}
