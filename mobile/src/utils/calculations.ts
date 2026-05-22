type ChargeParams = {
  sacks: number;
  weightPerSack: number;
  ratePerKg: number;
  charges: {
    apmcPct: number;
    bardanaPerSack: number;
    cartagePerKg: number;
  };
  applyApmc?: boolean;
  applyBardana?: boolean;
  bardanaSacks?: number;
  bardanaRate?: number;
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
  const {
    sacks,
    weightPerSack,
    ratePerKg,
    charges,
    applyApmc = true,
    applyBardana = true,
    bardanaSacks = sacks,
    bardanaRate = charges.bardanaPerSack,
  } = params;
  const totalWeight = sacks * weightPerSack;
  const gross = totalWeight * ratePerKg;
  const apmc = applyApmc ? gross * (charges.apmcPct / 100) : 0;
  const bardana = applyBardana ? bardanaSacks * bardanaRate : 0;
  const cartage = totalWeight * charges.cartagePerKg;
  const net = gross + apmc + bardana + cartage;
  return { totalWeight, gross, apmc, bardana, cartage, net };
}

export function calculateBill(totalWeight: number, ratePerKg: number, charges: {
  apmcCommission?: number;
  bardanaPerSack?: number;
  cartagePerKg?: number;
}) {
  const gross = totalWeight * ratePerKg;
  const apmc = gross * ((charges.apmcCommission ?? 0) / 100);
  const cartage = totalWeight * (charges.cartagePerKg ?? 0);
  const net = gross + apmc + cartage;
  return {
    gross,
    apmc,
    bardana: 0,
    cartage,
    net,
    breakdown: { apmc, bardana: 0, cartage },
  };
}
