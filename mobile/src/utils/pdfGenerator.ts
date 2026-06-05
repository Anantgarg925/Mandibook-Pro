import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import type { Inquiry } from '@/types/inquiry';
import type { ShopData } from '@/context/ShopContext';
import type { Truck } from '@/types/truck';
import { printHtmlOnWeb } from '@/utils/webExport';

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

function formatPlainAmount(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const GRADE_ORDER = ['I', 'II', 'III', 'IV', 'V', 'PILA', 'PEELA', 'CHURAA', 'CHURA', 'KP'];

const compareGrades = (a: string, b: string) => {
  const normA = a.toUpperCase().trim();
  const normB = b.toUpperCase().trim();
  let indexA = GRADE_ORDER.indexOf(normA);
  let indexB = GRADE_ORDER.indexOf(normB);

  if (normA.startsWith('CHUR')) indexA = GRADE_ORDER.indexOf('CHURA');
  if (normB.startsWith('CHUR')) indexB = GRADE_ORDER.indexOf('CHURA');
  if (normA.startsWith('PEEL') || normA === 'PILA') indexA = GRADE_ORDER.indexOf('PILA');
  if (normB.startsWith('PEEL') || normB === 'PILA') indexB = GRADE_ORDER.indexOf('PILA');

  if (indexA !== -1 && indexB !== -1) {
    return indexA - indexB;
  }
  if (indexA !== -1) return -1;
  if (indexB !== -1) return 1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

function buildGradeSummary(inquiries: Inquiry[]): GradeSummaryRow[] {
  const map = new Map<string, GradeSummaryRow>();
  for (const inq of inquiries) {
    const entries = (inq.chargeSnapshot as any)?.entries;
    const subEntries = Array.isArray(entries) && entries.length > 0
      ? entries
      : [{
          grade: inq.grade,
          gradeName: inq.gradeName || inq.grade,
          sacks: inq.sacks,
          totalWeight: inq.totalWeight,
          grossAmount: inq.grossAmount,
          ratePerKg: inq.ratePerKg,
        }];

    for (const entry of subEntries) {
      const gradeKey = entry.grade || 'MIXED';
      const gradeName = entry.gradeName || gradeKey;
      const sacks = Number(entry.sacks) || 0;
      const weight = Number(entry.totalWeight) || 0;
      const gross = Number(entry.grossAmount) || 0;
      const rate = Number(entry.ratePerKg) || 0;

      const existing = map.get(gradeKey);
      if (existing) {
        existing.sacks += sacks;
        existing.weight += weight;
        existing.gross += gross;
        existing.avgRate = existing.weight > 0 ? existing.gross / existing.weight : 0;
      } else {
        map.set(gradeKey, {
          grade: gradeKey,
          gradeName,
          sacks,
          weight,
          avgRate: rate,
          gross,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    compareGrades(a.grade, b.grade)
  );
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

function buildBuyerSummaryByName(inquiries: Inquiry[]): BuyerSummaryRow[] {
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
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildTruckReports(inquiries: Inquiry[], trucks: Truck[], shop: ShopData) {
  const commissionPct = shop.charges?.agentCommission ?? 0;
  const telePost = shop.charges?.telePost ?? 0;
  const telePostShare = trucks.length > 0 ? telePost / trucks.length : 0;

  return trucks.map((truck) => {
    const rows = inquiries.filter((inq) => inq.truckId === truck.id);
    const gross = rows.reduce((sum, inq) => sum + inq.grossAmount, 0);
    const apmc = rows.reduce((sum, inq) => sum + inq.apmcAmount, 0);
    const weight = rows.reduce((sum, inq) => sum + inq.totalWeight, 0);
    const cartage = Math.round(weight * (shop.charges?.cartagePerKg || 0));
    const bardana = rows.reduce((sum, inq) => sum + inq.bardanaAmount, 0);
    const commission = gross * commissionPct / 100;
    const grades = buildGradeSummary(rows);

    return {
      truck,
      bills: rows.length,
      sacks: rows.reduce((sum, inq) => sum + inq.sacks, 0),
      weight,
      gross,
      apmc,
      cartage,
      bardana,
      commission,
      telePost: telePostShare,
      net: gross - truck.freightAmount - commission - apmc - cartage - bardana - telePostShare,
      grades,
    };
  });
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
  const dayBookBuyerSummary = buildBuyerSummaryByName(confirmedInquiries);
  const truckReports = buildTruckReports(confirmedInquiries, trucks, shop);

  const totalSacks = gradeSummary.reduce((s, r) => s + r.sacks, 0);
  const totalWeight = gradeSummary.reduce((s, r) => s + r.weight, 0);
  const totalGross = gradeSummary.reduce((s, r) => s + r.gross, 0);
  const totalAvgRate = totalWeight > 0 ? totalGross / totalWeight : 0;

  const totalFreight = trucks.reduce((s, t) => s + t.freightAmount, 0);
  const totalApmc = confirmedInquiries.reduce((s, i) => s + i.apmcAmount, 0);
  const totalCartage = Math.round(totalWeight * (shop.charges?.cartagePerKg || 0));
  const totalBardana = confirmedInquiries.reduce((s, i) => s + i.bardanaAmount, 0);
  const commissionPct = shop.charges?.agentCommission ?? 0;
  const telePost = shop.charges?.telePost ?? 0;
  const commission = totalGross * commissionPct / 100;
  const netToSender = totalGross - totalFreight - commission - totalApmc - totalCartage - totalBardana - telePost;
  const totalOther = totalApmc + totalCartage + totalBardana + telePost;

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
      <div style="font-size:18px; font-weight:900; color:#1B5E20;">${shop.firmName}</div>
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

  const truckReportRows = truckReports.map((report) => {
    const rows = report.grades.map((r) => `
      <tr>
        <td>${r.grade} (${r.gradeName})</td>
        <td style="text-align:right;">${r.sacks}</td>
        <td style="text-align:right;">${r.weight.toFixed(0)} kg</td>
        <td style="text-align:right;">${toIndianCurrency(r.gross)}</td>
      </tr>
    `).join('');

    return `
      <div class="truck-card">
        <div class="truck-title">${report.truck.truckNumber} - ${report.truck.senderName || 'Sender'}</div>
        <div class="truck-meta">Load: ${report.truck.totalKg.toFixed(0)} kg | Bills: ${report.bills} | Freight: ${toIndianCurrency(report.truck.freightAmount)}</div>
        <table>
          <thead><tr><th>Grade</th><th style="text-align:right">Sacks</th><th style="text-align:right">Weight</th><th style="text-align:right">Gross</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" style="color:#616161;">No confirmed bills for this truck</td></tr>'}</tbody>
          <tfoot class="foot"><tr><td>Total</td><td style="text-align:right">${report.sacks}</td><td style="text-align:right">${report.weight.toFixed(0)} kg</td><td style="text-align:right">${toIndianCurrency(report.gross)}</td></tr></tfoot>
        </table>
        <div class="account-row"><span>Commission</span><span class="deduct">-${toIndianCurrency(report.commission)}</span></div>
        <div class="account-row"><span>APMC + Cartage + Bardana</span><span class="deduct">-${toIndianCurrency(report.apmc + report.cartage + report.bardana)}</span></div>
        <div class="account-row net"><span>Truck Net</span><span>${toIndianCurrency(report.net)}</span></div>
      </div>
    `;
  }).join('');

  const arrivalRows = truckReports.map((report, index) => `
    <tr>
      <td style="text-align:right;">${index + 1}</td>
      <td>${report.truck.truckNumber}</td>
      <td>${report.truck.senderName || 'Sender'}</td>
      <td style="text-align:right;">${formatPlainAmount(report.gross)}</td>
      <td style="text-align:right;">${formatPlainAmount(report.truck.freightAmount)}</td>
      <td style="text-align:right;">${formatPlainAmount(report.cartage)}</td>
      <td style="text-align:right;">${formatPlainAmount(report.commission)}</td>
      <td style="text-align:right;">${formatPlainAmount(report.bardana)}</td>
      <td style="text-align:right;">${formatPlainAmount(report.apmc + report.telePost)}</td>
      <td style="text-align:right;">${formatPlainAmount(report.net)}</td>
    </tr>
  `).join('');

  const dayBookBuyerRows = dayBookBuyerSummary.map((r, i) => `
    <tr>
      <td style="text-align:right;">${i + 1}</td>
      <td>${r.name}</td>
      <td style="text-align:right;">${r.sacks}</td>
      <td style="text-align:right;">${formatPlainAmount(r.weight)}</td>
      <td style="text-align:right;">${formatPlainAmount(r.gross)}</td>
      <td style="text-align:right;">${formatPlainAmount(r.apmc)}</td>
      <td style="text-align:right;">${formatPlainAmount(r.bardana)}</td>
      <td style="text-align:right;">${formatPlainAmount(r.net)}</td>
    </tr>
  `).join('');

  const mandiBookRows = truckReports.map((report) => {
    const rows = confirmedInquiries
      .filter((inq) => inq.truckId === report.truck.id)
      .sort((a, b) => a.grade.localeCompare(b.grade) || a.createdAt - b.createdAt)
      .map((inq) => `
        <tr>
          <td>${inq.gradeName || inq.grade}</td>
          <td style="text-align:right;"></td>
          <td style="text-align:right;"></td>
          <td style="text-align:right;"></td>
          <td style="text-align:right;"></td>
          <td>${inq.paymentMode === 'CASH' ? 'CS' : inq.paymentMode === 'UPI' ? 'UPI' : inq.customerName.slice(0, 5).toUpperCase()}</td>
          <td>${inq.customerName}</td>
          <td style="text-align:right;">${inq.sacks}</td>
          <td style="text-align:right;">${formatPlainAmount(inq.totalWeight)}</td>
          <td style="text-align:right;">${inq.ratePerKg.toFixed(2)}</td>
          <td style="text-align:right;">${formatPlainAmount(inq.grossAmount)}</td>
        </tr>
      `).join('');

    return `
      <div class="mandi-truck">
        <div class="mandi-title">C# : ${report.truck.senderCode || report.truck.id.slice(-5)} [FRESH] ${report.truck.senderName || 'Sender'}</div>
        <div class="mandi-meta">GR/TR #: ${report.truck.truckNumber} &nbsp; CHL #: ${report.truck.chlNumber || '-'}</div>
        <table class="compact">
          <thead><tr><th>Item</th><th style="text-align:right">Case</th><th style="text-align:right">WT (Kg)</th><th style="text-align:right">Rate</th><th style="text-align:right">Gross</th><th>Buyer</th><th>Name</th><th style="text-align:right">Case</th><th style="text-align:right">WT (Kg)</th><th style="text-align:right">Rate</th><th style="text-align:right">B-T Gross</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="11" style="color:#616161;">No confirmed buyer lines for this truck</td></tr>'}</tbody>
          <tfoot class="foot"><tr><td>GR-TOTAL</td><td style="text-align:right">${report.sacks}</td><td style="text-align:right">${formatPlainAmount(report.weight)}</td><td></td><td style="text-align:right">${formatPlainAmount(report.gross)}</td><td colspan="2"></td><td style="text-align:right">${report.sacks}</td><td style="text-align:right">${formatPlainAmount(report.weight)}</td><td></td><td style="text-align:right">${formatPlainAmount(report.gross)}</td></tr></tfoot>
        </table>
      </div>
    `;
  }).join('');

  const agentBills = confirmedInquiries.filter(i => i.sourceAgentName);
  
  const agentMap = new Map<string, Inquiry[]>();
  for (const bill of agentBills) {
    const key = bill.sourceAgentName!;
    if (!agentMap.has(key)) agentMap.set(key, []);
    agentMap.get(key)!.push(bill);
  }

  const agentBookRows = Array.from(agentMap.entries()).map(([agentName, bills]) => {
    let agentTotalSacks = 0;
    let agentTotalWeight = 0;
    let agentTotalPurchaseGross = 0;
    let agentTotalSaleGross = 0;

    const allEntries = bills.flatMap(inq => {
      const entries = (inq.chargeSnapshot as any)?.entries || [inq];
      const purchaseRate = inq.totalWeight > 0 ? (inq.agentPurchaseAmount || 0) / inq.totalWeight : 0;
      return entries.map((entry: any) => ({
        ...entry,
        createdAt: inq.createdAt,
        customerName: inq.customerName,
        paymentMode: inq.paymentMode,
        purchaseRate,
        purchaseGross: entry.totalWeight * purchaseRate,
      }));
    });

    const rows = allEntries.sort((a, b) => a.grade.localeCompare(b.grade) || a.createdAt - b.createdAt).map(entry => {
      agentTotalSacks += entry.sacks;
      agentTotalWeight += entry.totalWeight;
      agentTotalPurchaseGross += entry.purchaseGross;
      agentTotalSaleGross += entry.grossAmount;
      
      const buyerInfo = entry.paymentMode === 'CASH' ? 'CS' : entry.paymentMode === 'UPI' ? 'UPI' : (entry.customerName || '').slice(0, 5).toUpperCase();

      return `
        <tr>
          <td>${entry.gradeName || entry.grade}</td>
          <td style="text-align:right;">${entry.sacks}</td>
          <td style="text-align:right;">${formatPlainAmount(entry.totalWeight)}</td>
          <td style="text-align:right;">${entry.purchaseRate.toFixed(2)}</td>
          <td style="text-align:right;">${formatPlainAmount(entry.purchaseGross)}</td>
          <td>${buyerInfo}</td>
          <td>${entry.customerName}</td>
          <td style="text-align:right;">${entry.sacks}</td>
          <td style="text-align:right;">${formatPlainAmount(entry.totalWeight)}</td>
          <td style="text-align:right;">${(entry.ratePerKg || 0).toFixed(2)}</td>
          <td style="text-align:right;">${formatPlainAmount(entry.grossAmount)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="mandi-truck" style="margin-top: 16px;">
        <div class="mandi-title">[AGENT] ${agentName.toUpperCase()}</div>
        <table class="compact">
          <thead><tr><th>Item Name</th><th style="text-align:right">Case</th><th style="text-align:right">WT (Kg)</th><th style="text-align:right">Rate</th><th style="text-align:right">P-Gross</th><th>Buyer</th><th>Name</th><th style="text-align:right">Case</th><th style="text-align:right">WT (Kg)</th><th style="text-align:right">Rate</th><th style="text-align:right">S-Gross</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot class="foot"><tr><td>TOTAL</td><td style="text-align:right">${agentTotalSacks}</td><td style="text-align:right">${formatPlainAmount(agentTotalWeight)}</td><td></td><td style="text-align:right">${formatPlainAmount(agentTotalPurchaseGross)}</td><td colspan="2"></td><td style="text-align:right">${agentTotalSacks}</td><td style="text-align:right">${formatPlainAmount(agentTotalWeight)}</td><td></td><td style="text-align:right">${formatPlainAmount(agentTotalSaleGross)}</td></tr></tfoot>
        </table>
      </div>
    `;
  }).join('');

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
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
      body { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
        font-size: 14px; 
        color: #1A1A1A; 
        line-height: 1.5;
      }
      h2 { font-size: 18px; font-weight: 800; color: #1B5E20; margin: 18px 0 10px; border-bottom: 2px solid #1B5E20; padding-bottom: 6px; }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-bottom: 18px; 
        page-break-inside: auto;
      }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      th { background: #1B5E20; color: white; padding: 8px 10px; text-align: left; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
      td { padding: 6px 10px; border-bottom: 1px solid #E0E0E0; font-size: 14px; }
      .foot td { background: #2E7D32; color: white; font-weight: bold; font-size: 14px; }
      .account-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E0E0E0; }
      .account-row.net { border-top: 2px solid #1A1A1A; border-bottom: 2px solid #1A1A1A; font-weight: 900; font-size: 16px; color: #2E7D32; margin-top: 6px; }
      .deduct { color: #C62828; }
      .page-break { page-break-before: always; }
      .truck-card { border: 1px solid #C8E6C9; border-radius: 8px; padding: 14px; margin-bottom: 16px; page-break-inside: avoid; }
      .truck-title { font-size: 16px; font-weight: 900; color: #1B5E20; }
      .truck-meta { font-size: 13px; color: #616161; margin: 4px 0 10px; }
      .compact th { font-size: 12px; padding: 6px; }
      .compact td { font-size: 12px; padding: 5px 6px; }
      .mandi-truck { page-break-inside: avoid; margin-bottom: 16px; }
      .mandi-title { font-size: 16px; font-weight: bold; margin: 10px 0 6px; color: #000; }
      .mandi-meta { font-size: 13px; color: #424242; margin-bottom: 8px; }
    </style>
  </head><body>
    ${header}
    <h2>Arrival Day-Book (Fresh Sale-Proceed)</h2>
    <table class="compact">
      <thead><tr><th>C No.</th><th>GR-No</th><th>Name</th><th style="text-align:right">Gross Amt</th><th style="text-align:right">Freight</th><th style="text-align:right">Cartage</th><th style="text-align:right">Commission</th><th style="text-align:right">Bardana</th><th style="text-align:right">Other Exp.</th><th style="text-align:right">Net</th></tr></thead>
      <tbody>${arrivalRows || '<tr><td colspan="10" style="color:#616161;">No trucks registered for this date</td></tr>'}</tbody>
      <tfoot class="foot"><tr><td colspan="3">Grand Total</td><td style="text-align:right">${formatPlainAmount(totalGross)}</td><td style="text-align:right">${formatPlainAmount(totalFreight)}</td><td style="text-align:right">${formatPlainAmount(totalCartage)}</td><td style="text-align:right">${formatPlainAmount(commission)}</td><td style="text-align:right">${formatPlainAmount(totalBardana)}</td><td style="text-align:right">${formatPlainAmount(totalApmc + telePost)}</td><td style="text-align:right">${formatPlainAmount(netToSender)}</td></tr></tfoot>
    </table>

    <table class="compact">
      <thead><tr><th>#</th><th>Name</th><th style="text-align:right">Case</th><th style="text-align:right">WT</th><th style="text-align:right">Gross</th><th style="text-align:right">APMC</th><th style="text-align:right">Bardana</th><th style="text-align:right">Net</th></tr></thead>
      <tbody>${dayBookBuyerRows || '<tr><td colspan="8" style="color:#616161;">No buyer rows</td></tr>'}</tbody>
      <tfoot class="foot"><tr><td colspan="2">Total</td><td style="text-align:right">${totalSacks}</td><td style="text-align:right">${formatPlainAmount(totalWeight)}</td><td style="text-align:right">${formatPlainAmount(totalGross)}</td><td style="text-align:right">${formatPlainAmount(totalApmc)}</td><td style="text-align:right">${formatPlainAmount(totalBardana)}</td><td style="text-align:right">${formatPlainAmount(dayBookBuyerSummary.reduce((s, r) => s + r.net, 0))}</td></tr></tfoot>
    </table>

    ${truckReports.map(r => `
      <div style="margin-top: 18px; margin-bottom: 6px; font-weight: 900; font-size: 15px; color: #1B5E20; text-transform: uppercase;">
        Net Settlement: ${r.truck.truckNumber}
      </div>
      <div class="account-row"><span>Gross Sale</span><span>${formatPlainAmount(r.gross)}</span></div>
      <div class="account-row"><span>Freight</span><span class="deduct">-${formatPlainAmount(r.truck.freightAmount)}</span></div>
      <div class="account-row"><span>Commission</span><span class="deduct">-${formatPlainAmount(r.commission)}</span></div>
      <div class="account-row"><span>APMC</span><span class="deduct">-${formatPlainAmount(r.apmc)}</span></div>
      ${r.cartage > 0 ? `<div class="account-row"><span>Cartage</span><span class="deduct">-${formatPlainAmount(r.cartage)}</span></div>` : ''}
      ${r.bardana > 0 ? `<div class="account-row"><span>Bardana</span><span class="deduct">-${formatPlainAmount(r.bardana)}</span></div>` : ''}
      ${r.telePost > 0 ? `<div class="account-row"><span>Tele/Post</span><span class="deduct">-${formatPlainAmount(r.telePost)}</span></div>` : ''}
      <div class="account-row net"><span>Net to Sender</span><span>${formatPlainAmount(r.net)}</span></div>
    `).join('')}

    <div class="page-break"></div>
    ${header}
    <h2>Mandi Book</h2>
    ${mandiBookRows || '<div style="color:#616161;">No mandi-book rows for this date</div>'}

    ${agentBookRows ? `
    <div class="page-break"></div>
    ${header}
    <h2>Agent Mandi Book</h2>
    ${agentBookRows}
    ` : ''}

    <div class="page-break"></div>
    ${header}
    <h2>Sale Summary</h2>
    <table>
      <thead><tr><th>Grade</th><th style="text-align:right">Sacks</th><th style="text-align:right">Weight</th><th style="text-align:right">Avg Rate</th><th style="text-align:right">Gross</th></tr></thead>
      <tbody>${gradeRows}</tbody>
      <tfoot class="foot"><tr><td>Total</td><td style="text-align:right">${totalSacks}</td><td style="text-align:right">${totalWeight.toFixed(0)} kg</td><td style="text-align:right">&#8377;${totalAvgRate.toFixed(2)}</td><td style="text-align:right">${toIndianCurrency(totalGross)}</td></tr></tfoot>
    </table>

    <div class="page-break"></div>
    ${header}
    <h2>Truck-wise Reports</h2>
    ${truckReportRows || '<div style="color:#616161;">No trucks registered for this date</div>'}

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
  if (Platform.OS === 'web') {
    await printHtmlOnWeb(html, 'Share Day Report');
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Day Report' });
}
