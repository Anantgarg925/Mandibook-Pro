import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const envPath = path.join(mobileRoot, '.env');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function getArg(name) {
  const prefix = `--${name}=`;
  const item = process.argv.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : undefined;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function codeFromName(name) {
  return name
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 8)
    .toUpperCase() || 'BUYER';
}

const buyerNames = {
  ACC: 'ASHOK;VINOD SAROJ (CHG.)',
  BDSP: 'BISHAN SWROOP DINESH KUMAR',
  CCTR: 'CHAITANYAA CHAND',
  CDS: 'CHANDESHWAR DASS MANTOO KUMAR',
  CS: 'CASH SALE',
  CTM: 'CHAUHAN TRADERS',
  DM: 'DURGESH SAROJ/SANJAY SAROJ',
  DS5: 'DK FRUITS',
  JDH: 'JIWAN DASS YOGESH KUMAR',
  KS2: 'KALIDAS NASKAR',
  MKM: 'M. KEWAL KRISHAN PARDEEP KUMAR',
  MPG: 'MAHESH DASS;RAMESH KUMAR',
  MT: 'EMPTY',
  PSS1: 'PARMOD SHAH',
  RAJUS: 'RAJEEV KUMAR FRUITS (SXT)',
  RNBS: 'RAKESH KUMAR AND SONS',
  RS3: 'SHREE VISHNU FRUITS',
  RS5: 'RAKESH KUMAR RAVI',
  RSS: 'RAHUL S/O JIYA LAL',
  RVB: 'RAMBIR SINGH/SACHIN KUMAR',
  SCHG: 'SONU FRUIT CO.(CHG.)',
  SDO: 'SUNDRY DEBITORS(ONLINE)',
  SUN: 'SAMIM AHMAD',
  TFCM: 'THAKUR FRUIT COMPANY',
  UPI: 'UPI',
  VCDS: 'VIKAS',
  VSS: 'VINOD SHUKLA',
};

const lotNames = {
  II: '2.MOSAMBI',
  III: '3.MOSAMBI',
  IV: '4.MOSAMBI',
  V: '5.MOSAMBI',
  KP: 'KP.MOSAMBI',
  PILA: 'P.MOSAMBI',
  CHURA: 'C.MOSAMBI',
  DAGI: 'MOSAMBI',
};

const mandiRows = [
  ['II', 'UPI', 1, 20, 73.5, 1500],
  ['II', 'RNBS', 2, 50, 70, 3565],
  ['II', 'MKM', 20, 200, 69, 14238],
  ['II', 'MKM', 5, 100, 69, 7044],
  ['II', 'KS2', 5, 125, 69, 8711.25],
  ['II', 'MPG', 54, 513, 67, 34714.71],
  ['III', 'UPI', 1, 25, 67, 1700],
  ['III', 'RS5', 21, 420, 63, 26724.6],
  ['III', 'CS', 1, 25, 66, 1680],
  ['III', 'SCHG', 32, 640, 63, 41203.2],
  ['III', 'UPI', 1, 30, 64, 2000],
  ['III', 'CTM', 31, 775, 64, 50096],
  ['III', 'CTM', 6, 120, 64, 7756.8],
  ['III', 'CTM', 6, 60, 64, 3878.4],
  ['III', 'DS5', 20, 500, 64, 32620],
  ['III', 'CCTR', 1, 20, 64, 1307.8],
  ['III', 'MPG', 30, 300, 62, 18786],
  ['III', 'MPG', 30, 285, 62, 17846.7],
  ['III', 'MPG', 11, 176, 62, 11021.12],
  ['III', 'UPI', 1, 10, 67, 700],
  ['III', 'JDH', 5, 100, 64, 6539],
  ['III', 'CS', 1, 10, 64, 650],
  ['III', 'MPG', 5, 47.01, 62, 3049.45],
  ['IV', 'CS', 3, 75, 53, 4060],
  ['IV', 'JDH', 15, 300, 52, 15981],
  ['IV', 'CS', 16, 400, 51, 20640],
  ['IV', 'SDO', 10, 250, 52, 13300],
  ['IV', 'UPI', 21, 525, 52, 27888],
  ['IV', 'DM', 16, 400, 52, 21248],
  ['IV', 'UPI', 2, 50, 52, 2630],
  ['IV', 'CS', 5, 125, 52, 6640],
  ['IV', 'RVB', 11, 275, 52, 14608],
  ['IV', 'UPI', 2, 50, 52, 2630],
  ['IV', 'RS3', 15, 195, 52, 10466.4],
  ['IV', 'PSS1', 6, 150, 52, 7968],
  ['IV', 'CS', 3, 75, 52, 4000],
  ['IV', 'DS5', 26, 650, 51, 33871.5],
  ['IV', 'CS', 4, 100, 53, 5410],
  ['IV', 'UPI', 6, 150, 54, 8180],
  ['IV', 'CDS', 14, 350, 51, 18028.5],
  ['IV', 'VCDS', 20, 490, 51, 25239.9],
  ['IV', 'BDSP', 11, 220, 52, 11719.4],
  ['IV', 'CS', 4, 100, 52, 5260],
  ['IV', 'CS', 10, 250, 52, 13150],
  ['IV', 'SUN', 100, 2500, 51, 128775],
  ['IV', 'RAJUS', 6, 150, 52, 7968],
  ['IV', 'CS', 1, 25, 52, 1310],
  ['IV', 'MPG', 3, 30, 52, 1575.6],
  ['IV', 'MPG', 3, 28.01, 52, 1496.82],
  ['IV', 'MPG', 1, 16, 52, 840.32],
  ['V', 'CS', 1, 25, 42, 1080],
  ['V', 'CS', 5, 125, 42, 5300],
  ['V', 'CS', 2, 50, 42, 2100],
  ['V', 'UPI', 6, 150, 40, 6100],
  ['V', 'UPI', 1, 25, 40, 1025],
  ['V', 'CS', 6, 150, 41, 6200],
  ['V', 'PSS1', 20, 500, 41, 21005],
  ['V', 'RNBS', 10, 250, 41, 10502.5],
  ['V', 'CS', 4, 100, 41, 4140],
  ['V', 'CS', 6, 150, 41, 6210],
  ['V', 'CS', 4, 100, 42, 4200],
  ['V', 'CS', 10, 250, 41, 10400],
  ['V', 'VSS', 16, 400, 41, 16804],
  ['V', 'SUN', 55, 1375, 42, 58327.5],
  ['V', 'RSS', 4, 100, 43, 4403],
  ['V', 'DM', 1, 25, 41, 1050.25],
  ['KP', 'CS', 5, 125, 52, 6640],
  ['KP', 'CS', 1, 25, 51, 1300],
  ['KP', 'TFCM', 8, 200, 50, 10220],
  ['KP', 'CS', 6, 150, 52, 7880],
  ['KP', 'DM', 16, 400, 48, 19632],
  ['PILA', 'CS', 3, 75, 48, 3640],
  ['PILA', 'DM', 1, 25, 48, 1227],
  ['CHURA', 'ACC', 4, 80, 48, 3878.4],
  ['DAGI', 'MT', 1, 25, 0, 0],
];

function paymentModeFor(code) {
  if (code === 'CS') return 'CASH';
  if (code === 'UPI') return 'UPI';
  return 'UDHAARI';
}

async function main() {
  loadEnvFile(envPath);

  const dryRun = process.argv.includes('--dry-run');
  const shopIdArg = getArg('shop-id') || process.env.SEED_SHOP_ID;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY in mobile/.env');
  }

  const date = Date.UTC(2026, 4, 14, 18, 30, 0);
  const truckId = 'rmandi-150526-truck-17';
  const baseCreatedAt = date + 18 * 60 * 60 * 1000 + 49 * 60 * 1000;
  const totalSacks = mandiRows.reduce((sum, row) => sum + row[2], 0);
  const totalWeight = round2(mandiRows.reduce((sum, row) => sum + row[3], 0));
  const totalGross = round2(mandiRows.reduce((sum, row) => sum + row[5], 0));

  const restBase = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;

  const request = async (table, { method = 'GET', query = '', body, prefer } = {}) => {
    const response = await fetch(`${restBase}/${table}${query}`, {
      method,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${method} ${table}${query}: ${response.status} ${text}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };

  let shopId = shopIdArg;
  if (!shopId) {
    const data = await request('shops', { query: '?select=id&limit=1' });
    if (!data?.[0]?.id) throw new Error('Could not discover shop id. Pass --shop-id=<id>.');
    shopId = data[0].id;
  }

  const buyerCodes = new Map();
  for (const row of mandiRows) {
    const code = row[1];
    if (code === 'CS' || code === 'MT') continue;
    buyerCodes.set(code, buyerNames[code]);
  }
  buyerCodes.set('__cashbook__', 'Cash Book');

  const inquiries = mandiRows.map(([lot, buyerCode, sacks, weight, rate, gross], index) => {
    const bardanaAmount = buyerCode === 'MT' ? 0 : sacks * 15;
    const apmcAmount = gross > 0 ? Math.round(gross * 0.01) : 0;
    const netAmount = round2(gross + apmcAmount + bardanaAmount);
    return {
      id: `rmandi-150526-bill-${String(index + 1).padStart(3, '0')}`,
      shop_id: shopId,
      slip_number: 644 + index,
      truck_id: truckId,
      truck_number: 'HR-38X-8125',
      customer_name: buyerNames[buyerCode],
      customer_phone: '',
      grade: lot,
      grade_name: lotNames[lot],
      sacks,
      weight_per_sack: round2(weight / sacks),
      total_weight: weight,
      rate_per_kg: rate,
      gross_amount: gross,
      apmc_amount: apmcAmount,
      bardana_amount: bardanaAmount,
      cartage_amount: 0,
      bardana_sacks: buyerCode === 'MT' ? 0 : sacks,
      bardana_rate: buyerCode === 'MT' ? 0 : 15,
      apply_bardana: buyerCode !== 'MT',
      apply_apmc: gross > 0,
      charge_snapshot: {
        source: 'RMANDI0150526-184905.pdf',
        apmcCommission: 1,
        bardanaPerSack: 15,
        cartagePerKg: 0,
        applyApmc: gross > 0,
        applyBardana: buyerCode !== 'MT',
      },
      net_amount: netAmount,
      payment_mode: paymentModeFor(buyerCode),
      upi_ref: buyerCode === 'UPI' ? 'RMANDI-150526' : '',
      status: 'PENDING',
      date,
      created_at: baseCreatedAt + index * 1000,
    };
  });

  const buyerTotals = new Map();
  for (const inquiry of inquiries) {
    if (inquiry.payment_mode !== 'UDHAARI') continue;
    const sourceCode = [...buyerCodes.entries()].find(([, name]) => name === inquiry.customer_name)?.[0] || codeFromName(inquiry.customer_name);
    const current = buyerTotals.get(sourceCode) || { amount: 0, name: inquiry.customer_name };
    current.amount = round2(current.amount + inquiry.net_amount);
    buyerTotals.set(sourceCode, current);
  }

  const buyers = [...buyerCodes.entries()].map(([code, name]) => ({
    id: `rmandi-150526-buyer-${code.replace(/[^a-z0-9_]/gi, '-').toLowerCase()}`,
    shop_id: shopId,
    code,
    name,
    phone: '',
    outstanding_balance: buyerTotals.get(code)?.amount || 0,
    last_transaction_date: baseCreatedAt,
    created_at: baseCreatedAt,
  }));

  const transactions = [...buyerTotals.entries()].map(([code, total], index) => ({
    id: `rmandi-150526-transaction-${String(index + 1).padStart(3, '0')}`,
    shop_id: shopId,
    buyer_code: code,
    type: 'SALE',
    amount: total.amount,
    date,
    payment_method: null,
    upi_ref: null,
    note: 'RMANDI 15/05/2026 day-end seeded sale',
    slip_number: null,
    created_at: baseCreatedAt + index * 1000,
  }));

  const members = [
    {
      id: 'rmandi-150526-member-admin',
      shop_id: shopId,
      name: 'Mandi Admin',
      phone: '9999900526',
      pin: '1505',
      role: 'ADMIN',
      created_at: baseCreatedAt,
    },
    {
      id: 'rmandi-150526-member-staff',
      shop_id: shopId,
      name: 'Mandi Staff',
      phone: '9999900527',
      pin: '0527',
      role: 'MEMBER',
      created_at: baseCreatedAt + 1000,
    },
  ];

  const truck = {
    id: truckId,
    shop_id: shopId,
    truck_number: 'HR-38X-8125',
    sender_name: 'NAIK IQBAL ANDHRA PRADESH',
    sender_code: 'NIAP',
    chl_number: '17720',
    total_kg: totalWeight,
    freight_amount: 134100,
    grade_inventory: Object.entries(lotNames).map(([code, name]) => ({
      code,
      name,
      totalKg: totalWeight,
      confirmedKg: inquiries.filter((inq) => inq.grade === code).reduce((sum, inq) => sum + inq.total_weight, 0),
      provisionalKg: 0,
    })),
    status: 'ACTIVE',
    date,
    created_at: baseCreatedAt,
  };

  console.log(`RMANDI seed for shop ${shopId}`);
  console.log(`Truck: ${truck.truck_number}, sacks: ${totalSacks}, weight: ${totalWeight}, buyer gross: ${totalGross}`);
  console.log(`Rows: ${inquiries.length} bills, ${buyers.length} buyers, ${transactions.length} udhaari transactions, ${members.length} members`);

  if (dryRun) return;

  const checked = async (label, action) => {
    await action();
    console.log(label);
  };

  const checkedOptional = async (label, action) => {
    try {
      await action();
      console.log(label);
    } catch (error) {
      if (String(error.message).includes('PGRST205')) {
        console.log(`${label} skipped: table not available in Supabase REST schema`);
        return;
      }
      throw error;
    }
  };

  await checked('Cleared old seeded transactions', () => request('transactions', { method: 'DELETE', query: '?id=like.rmandi-150526-*' }));
  await checked('Cleared old seeded inquiries', () => request('inquiries', { method: 'DELETE', query: '?id=like.rmandi-150526-*' }));
  await checked('Cleared old seeded truck', () => request('trucks', { method: 'DELETE', query: `?id=eq.${truckId}` }));
  await checked('Cleared old seeded buyers', () => request('buyers', { method: 'DELETE', query: '?id=like.rmandi-150526-*' }));
  await checkedOptional('Cleared old seeded members', () => request('members', { method: 'DELETE', query: '?id=like.rmandi-150526-*' }));

  await checkedOptional('Added member details', () => request('members', { method: 'POST', body: members }));
  await checked('Registered truck', () => request('trucks', { method: 'POST', body: truck }));
  await checked('Added buyer details', () => request('buyers', { method: 'POST', body: buyers }));
  await checked('Generated pending bills', () => request('inquiries', { method: 'POST', body: inquiries }));
  await checked(
    'Authorized generated bills',
    () => request(
      'inquiries',
      {
        method: 'PATCH',
        query: `?id=like.rmandi-150526-bill-*&shop_id=eq.${shopId}`,
        body: { status: 'CONFIRMED' },
      }
    )
  );
  await checked('Added udhaari sale ledger transactions', () => request('transactions', { method: 'POST', body: transactions }));

  const [seededTrucks, seededBills, seededTransactions] = await Promise.all([
    request('trucks', { query: `?select=id&id=eq.${truckId}&shop_id=eq.${shopId}` }),
    request('inquiries', { query: `?select=id&id=like.rmandi-150526-bill-*&shop_id=eq.${shopId}&status=eq.CONFIRMED` }),
    request('transactions', { query: `?select=id&id=like.rmandi-150526-transaction-*&shop_id=eq.${shopId}` }),
  ]);
  console.log(`Verified seeded rows: ${seededTrucks.length} truck, ${seededBills.length} confirmed bills, ${seededTransactions.length} ledger transactions`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
