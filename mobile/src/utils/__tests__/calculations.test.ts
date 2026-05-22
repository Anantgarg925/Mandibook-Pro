import { calculateCharges } from '@/utils/calculations';

describe('calculateCharges', () => {
  it('calculates gross, market charges, and net for a bill', () => {
    const result = calculateCharges({
      sacks: 10,
      weightPerSack: 25,
      ratePerKg: 40,
      charges: {
        apmcPct: 1,
        bardanaPerSack: 5,
        cartagePerKg: 0.2,
      },
      applyApmc: true,
      applyBardana: true,
    });

    expect(result.totalWeight).toBe(250);
    expect(result.gross).toBe(10000);
    expect(result.apmc).toBe(100);
    expect(result.bardana).toBe(50);
    expect(result.cartage).toBe(50);
    expect(result.net).toBe(10200);
  });

  it('respects disabled APMC and bardana toggles', () => {
    const result = calculateCharges({
      sacks: 4,
      weightPerSack: 20,
      ratePerKg: 50,
      charges: {
        apmcPct: 1,
        bardanaPerSack: 5,
        cartagePerKg: 0,
      },
      applyApmc: false,
      applyBardana: false,
    });

    expect(result.gross).toBe(4000);
    expect(result.apmc).toBe(0);
    expect(result.bardana).toBe(0);
    expect(result.net).toBe(4000);
  });
});
