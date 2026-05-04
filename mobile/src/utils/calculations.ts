type ChargeParams = {
  sacks: number;
  weightPerSack: number;
  ratePerKg: number;
  charges: {
    apmcPct: number;
    bardanaPerSack: number;
    cartagePerKg: number;
  };
};

type ChargeResult = {
  totalWeight: number;
  gross: number;
  apmc: number;
  bardana: number;
  cartage: number;
  net: number;
};

export function calculateCharges(params: ChargeParams): ChargeResult {
  const { sacks, weightPerSack, ratePerKg, charges } = params;
  const totalWeight = sacks * weightPerSack;
  const gross = totalWeight * ratePerKg;
  const apmc = gross * (charges.apmcPct / 100);
  const bardana = sacks * charges.bardanaPerSack;
  const cartage = totalWeight * charges.cartagePerKg;
  const net = gross - apmc - bardana - cartage;
  return { totalWeight, gross, apmc, bardana, cartage, net };
}
