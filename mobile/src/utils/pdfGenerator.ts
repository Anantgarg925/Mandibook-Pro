import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import type { Inquiry } from '@/types/inquiry';
import type { ShopData } from '@/context/ShopContext';
import type { Truck } from '@/types/truck';

export type GradeSummaryRow = {
  grade: string;
  gradeName: string;
  sacks: number;
  weight: number;
  avgRate: number;
  gross: number;
};

export type AccountsSummary = {
  gross: number;
  freight: number;
  commission: number;
  apmc: number;
  cartage: number;
  bardana: number;
  net: number;
};

export type PaymentSummary = {
  cash: { amount: number; count: number };
  upi: { amount: number; count: number };
  udhaari: { amount: number; count: number };
};

export type CashEntry = {
  id: string;
  type: 'RECEIPT' | 'PAYMENT';
  description: string;
  amount: number;
  createdAt: number;
};

export type BuyerSummaryRow = {
  name: string;
  sacks: number;
  weight: number;
  gross: number;
  apmc: number;
  bardana: number;
  net: number;
};

function buildGradeSummary(inquiries: Inquiry[]): GradeSummaryRow[] {
  const map = new Map<string, GradeSummaryRow>();
  for (const inq of inquiries) {
    const existing = map.get(inq.grade);
    if (existing) {
      existing.sacks += inq.sacks;
      existing.weight += inq.totalWeight;
      existing.gross += inq.grossAmount;
      existing.avgRate = existing.gross / existing.weight;
    } else {
      map.set(inq.grade, {
        grade: inq.grade,
        gradeName: inq.gradeName,
        sacks: inq.sacks,
        weight: inq.totalWeight,
        avgRate: inq.ratePerKg,
        gross: inq.grossAmount,
      });
    }
  }
  return Array.from(map.values());
}

function buildBuyerSummary(inquiries: Inquiry[]): BuyerSummaryRow[] {
  const map = new Map<string, BuyerSummaryRow>();
  for (const inq of inquiries) {
    const key = inq.customerName;
    const existing = map.get(key);
    if (existing) {
      existing.sacks += inq.sacks;
      existing.weight += inq.totalWeight;
      existing.gross += inq.grossAmount;
      existing.apmc += inq.apmcAmount;
      existing.bardana += inq.bardanaAmount;
      existing.net += inq.netAmount;
    } else {
      map.set(key, {
        name: inq.customerName,
        sacks: inq.sacks,
        weight: inq.totalWeight,
        gross: inq.grossAmount,
        apmc: inq.apmcAmount,
        bardana: inq.bardanaAmount,
        net: inq.netAmount,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
}

export function generateDayReportHTML(params: {
  date: number;
  shop: ShopData;
  confirmedInquiries: Inquiry[];
  trucks: Truck[];
  cashEntries: CashEntry[];
}): string {
  const { date, shop, confirmedInquiries, trucks, cashEntries } = params;

  const gradeSummary = buildGradeSummary(confirmedInquiries);
  const buyerSummary = buildBuyerSummary(confirmedInquiries);

  const totalSacks = gradeSummary.reduce((s, r) => s + r.sacks, 0);
  const totalWeight = gradeSummary.reduce((s, r) => s + r.weight, 0);
  const totalGross = gradeSummary.reduce((s, r) => s + r.gross, 0);
  const totalAvgRate = totalWeight > 0 ? totalGross / totalWeight : 0;

  const totalFreight = trucks.reduce((s, t) => s + t.freightAmount, 0);
  const totalApmc = confirmedInquiries.reduce((s, i) => s + i.apmcAmount, 0);
  const totalCartage = confirmedInquiries.reduce((s, i) => s + i.cartageAmount, 0);
  const totalBardana = confirmedInquiries.reduce((s, i) => s + i.bardanaAmount, 0);
  const commissionPct = shop.charges?.agentCommission ?? 0;
  const telePost = shop.charges?.telePost ?? 0;
  const commission = totalGross * commissionPct / 100;
  const netToSender = totalGross - totalFreight - commission - totalApmc - totalCartage - totalBardana - telePost;

  // Cash book
  const cashReceipts = [
    ...cashEntries.filter(e => e.type === 'RECEIPT'),
    ...confirmedInquiries.filter(i => i.paymentMode === 'CASH').map(i => ({
      id: i.id,
      type: 'RECEIPT' as const,
      description: `Sale #${i.slipNumber} - ${i.customerName}`,
      amount: i.netAmount,
      createdAt: i.createdAt,
    })),
  ];
  const cashPayments = cashEntries.filter(e => e.type === 'PAYMENT');
  const totalReceipts = cashReceipts.reduce((s, e) => s + e.amount, 0);
  const totalPayments = cashPayments.reduce((s, e) => s + e.amount, 0);
  const closingBalance = totalReceipts - totalPayments;

  const header = `
    <div style="text-align:center; margin-bottom:12px;">
      <div style="font-size:18px; font-weight:900; color:#FF6B00;">${shop.firmName}</div>
      <div style="font-size:11px; color:#616161;">${shop.address}, ${shop.city}</div>
      <div style="font-size:11px; color:#616161;">Date: ${toIndianDate(date)}</div>
    </div>
  `;

  const gradeRows = gradeSummary.map(r => `
    <tr>
      <td>${r.grade} (${r.gradeName})</td>
      <td style="text-align:right;">${r.sacks}</td>
      <td style="text-align:right;">${r.weight.toFixed(0)} kg</td>
      <td style="text-align:right;">&#8377;${r.avgRate.toFixed(2)}</td>
      <td style="text-align:right;">${toIndianCurrency(r.gross)}</td>
    </tr>
  `).join('');

  const buyerRows = buyerSummary.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#FFF' : '#F5F5F5'}">
      <td>${i + 1}</td>
      <td>${r.name}</td>
      <td style="text-align:right;">${r.sacks}</td>
      <td style="text-align:right;">${r.weight.toFixed(0)} kg</td>
      <td style="text-align:right;">${toIndianCurrency(r.gross)}</td>
      <td style="text-align:right;">${toIndianCurrency(r.apmc)}</td>
      <td style="text-align:right;">${toIndianCurrency(r.bardana)}</td>
      <td style="text-align:right;">${toIndianCurrency(r.net)}</td>
    </tr>
  `).join('');

  const cashReceiptRows = cashReceipts.map(e => `
    <tr><td>${e.description}</td><td style="text-align:right;color:#2E7D32;">${toIndianCurrency(e.amount)}</td></tr>
  `).join('');

  const cashPaymentRows = cashPayments.map(e => `
    <tr><td>${e.description}</td><td style="text-align:right;color:#C62828;">${toIndianCurrency(e.amount)}</td></tr>
  `).join('');

  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: monospace; font-size: 12px; color: #1A1A1A; padding: 16px; }
      h2 { font-size: 14px; font-weight: 900; color: #FF6B00; margin: 16px 0 8px; border-bottom: 2px solid #FF6B00; padding-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #FF6B00; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
      td { padding: 5px 8px; border-bottom: 1px solid #E0E0E0; font-size: 11px; }
      .foot td { background: #2E7D32; color: white; font-weight: 900; }
      .account-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #E0E0E0; }
      .account-row.net { border-top: 2px solid #1A1A1A; border-bottom: 2px solid #1A1A1A; font-weight: 900; font-size: 14px; color: #2E7D32; margin-top: 4px; }
      .deduct { color: #C62828; }
      .page-break { page-break-before: always; }
    </style>
  </head><body>
    ${header}
    <h2>Sale Summary</h2>
    <table>
      <thead><tr><th>Grade</th><th style="text-align:right">Sacks</th><th style="text-align:right">Weight</th><th style="text-align:right">Avg Rate</th><th style="text-align:right">Gross</th></tr></thead>
      <tbody>${gradeRows}</tbody>
      <tfoot class="foot"><tr><td>Total</td><td style="text-align:right">${totalSacks}</td><td style="text-align:right">${totalWeight.toFixed(0)} kg</td><td style="text-align:right">&#8377;${totalAvgRate.toFixed(2)}</td><td style="text-align:right">${toIndianCurrency(totalGross)}</td></tr></tfoot>
    </table>

    <div class="page-break"></div>
    ${header}
    <h2>Day Book (Accounts)</h2>
    <div class="account-row"><span>Gross Sale</span><span>${toIndianCurrency(totalGross)}</span></div>
    <div class="account-row"><span>Less Freight</span><span class="deduct">-${toIndianCurrency(totalFreight)}</span></div>
    <div class="account-row"><span>Less Commission (${commissionPct}%)</span><span class="deduct">-${toIndianCurrency(commission)}</span></div>
    <div class="account-row"><span>Less APMC</span><span class="deduct">-${toIndianCurrency(totalApmc)}</span></div>
    <div class="account-row"><span>Less Cartage</span><span class="deduct">-${toIndianCurrency(totalCartage)}</span></div>
    <div class="account-row"><span>Less Tele &amp; Post</span><span class="deduct">-${toIndianCurrency(telePost)}</span></div>
    <div class="account-row"><span>Less Bardana</span><span class="deduct">-${toIndianCurrency(totalBardana)}</span></div>
    <div class="account-row net"><span>NET TO SENDER</span><span>${toIndianCurrency(netToSender)}</span></div>

    <div class="page-break"></div>
    ${header}
    <h2>Buyer Summary</h2>
    <table>
      <thead><tr><th>#</th><th>Name</th><th style="text-align:right">Sacks</th><th style="text-align:right">Weight</th><th style="text-align:right">Gross</th><th style="text-align:right">APMC</th><th style="text-align:right">Bardana</th><th style="text-align:right">Net</th></tr></thead>
      <tbody>${buyerRows}</tbody>
      <tfoot class="foot"><tr><td colspan="2">Total</td><td style="text-align:right">${buyerSummary.reduce((s, r) => s + r.sacks, 0)}</td><td style="text-align:right">${buyerSummary.reduce((s, r) => s + r.weight, 0).toFixed(0)} kg</td><td style="text-align:right">${toIndianCurrency(buyerSummary.reduce((s, r) => s + r.gross, 0))}</td><td style="text-align:right">${toIndianCurrency(buyerSummary.reduce((s, r) => s + r.apmc, 0))}</td><td style="text-align:right">${toIndianCurrency(buyerSummary.reduce((s, r) => s + r.bardana, 0))}</td><td style="text-align:right">${toIndianCurrency(buyerSummary.reduce((s, r) => s + r.net, 0))}</td></tr></tfoot>
    </table>

    <div class="page-break"></div>
    ${header}
    <h2>Cash Book</h2>
    <table>
      <thead><tr><th>Receipts</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${cashReceiptRows || '<tr><td colspan="2" style="color:#616161;">No receipts</td></tr>'}</tbody>
      <tfoot class="foot"><tr><td>Total Receipts</td><td style="text-align:right">${toIndianCurrency(totalReceipts)}</td></tr></tfoot>
    </table>
    <table>
      <thead><tr><th>Payments</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${cashPaymentRows || '<tr><td colspan="2" style="color:#616161;">No payments</td></tr>'}</tbody>
      <tfoot class="foot"><tr><td>Total Payments</td><td style="text-align:right">${toIndianCurrency(totalPayments)}</td></tr></tfoot>
    </table>
    <div class="account-row net"><span>Closing Balance</span><span>${toIndianCurrency(closingBalance)}</span></div>
  </body></html>`;
}

export async function exportAndShareReport(params: Parameters<typeof generateDayReportHTML>[0]): Promise<void> {
  const html = generateDayReportHTML(params);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Day Report' });
}
