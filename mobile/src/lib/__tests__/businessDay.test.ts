import { getBusinessDateKey, getCurrentBusinessDate } from '@/lib/businessDay';

describe('business day', () => {
  it('uses previous day before the 3 AM rollover', () => {
    const businessDate = getCurrentBusinessDate(new Date(2026, 4, 16, 2, 30));
    expect(getBusinessDateKey(businessDate)).toBe('2026-05-15');
  });

  it('uses current day after the 3 AM rollover', () => {
    const businessDate = getCurrentBusinessDate(new Date(2026, 4, 16, 3, 1));
    expect(getBusinessDateKey(businessDate)).toBe('2026-05-16');
  });
});
