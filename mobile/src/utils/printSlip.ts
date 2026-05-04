import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Inquiry } from '@/types/inquiry';
import type { ShopData } from '@/context/ShopContext';

export function generateSlipHTML(inquiry: Inquiry, shop: ShopData): string {
  const upiInfo = shop.upiId ? `GPay/Paytm: ${shop.upiId}` : shop.upiApps.join('/');
  const cartageRow =
    inquiry.cartageAmount > 0
      ? `<tr><td>Cartage</td><td></td><td></td><td class="right">${inquiry.cartageAmount.toFixed(0)}</td></tr>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: 58mm auto; margin: 2mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: monospace; font-size: 10px; width: 54mm; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .firm { font-size: 13px; font-weight: bold; }
  .small { font-size: 9px; color: #555; }
  .divider { border-top: 1px dashed #000; margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  td { padding: 1px 2px; vertical-align: top; }
  .total-row td { border-top: 1px solid #000; font-weight: bold; font-size: 10px; }
  .net-row td { border-top: 1px solid #000; border-bottom: 1px solid #000; font-size: 11px; font-weight: bold; }
  .header-row { font-weight: bold; font-size: 9px; border-bottom: 1px solid #000; }
</style>
</head>
<body>
  <div class="small" style="display:flex;justify-content:space-between;">
    <span>M:${shop.phone1}</span>
    <span>${shop.phone2 ? 'M:' + shop.phone2 : ''}</span>
  </div>
  <div class="center" style="margin:4px 0;">
    <div class="firm">${shop.firmName}</div>
    <div class="small">${shop.address}</div>
    <div class="small">${shop.city}</div>
    ${upiInfo ? `<div class="small">${upiInfo}</div>` : ''}
  </div>
  <div class="divider"></div>
  <table>
    <tr>
      <td class="bold">No. ${inquiry.slipNumber}</td>
      <td class="right small">Date: ${new Date(inquiry.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
    </tr>
  </table>
  <div>M/s. <span class="bold">${inquiry.customerName}</span></div>
  ${inquiry.customerPhone ? `<div class="small">📞 ${inquiry.customerPhone}</div>` : ''}
  <div class="divider"></div>
  <table>
    <tr class="header-row">
      <td>Description</td><td>Wt</td><td>Rate</td><td class="right">Amt</td>
    </tr>
    <tr>
      <td>${inquiry.grade} (${inquiry.gradeName})<br/><span class="small">${inquiry.sacks}×${inquiry.weightPerSack}kg</span></td>
      <td>${inquiry.totalWeight}kg</td>
      <td>₹${inquiry.ratePerKg}</td>
      <td class="right">${inquiry.grossAmount.toFixed(0)}</td>
    </tr>
    <tr><td>APMC</td><td></td><td></td><td class="right">${inquiry.apmcAmount.toFixed(0)}</td></tr>
    <tr><td>Bardana</td><td></td><td></td><td class="right">${inquiry.bardanaAmount.toFixed(0)}</td></tr>
    ${cartageRow}
    <tr class="net-row">
      <td colspan="3">NET AMOUNT</td>
      <td class="right">₹${inquiry.netAmount.toFixed(0)}</td>
    </tr>
  </table>
  <div class="divider"></div>
  <div class="small">Payment: <span class="bold">${inquiry.paymentMode}${inquiry.upiRef ? ' [' + inquiry.upiRef + ']' : ''}</span></div>
  <div class="small">Truck: ${inquiry.truckNumber}</div>
  <div class="divider"></div>
  <table>
    <tr>
      <td class="bold" style="font-size:9px;">Authorized ✓</td>
      <td class="right small">[STAMP]</td>
    </tr>
  </table>
  <div class="divider"></div>
  <div class="small center">वजन की जिम्मेदारी हमारी नहीं</div>
  <div class="small" style="display:flex;justify-content:space-between;">
    <span>E.&amp;O.E.</span><span>धन्यवाद!</span>
  </div>
</body>
</html>`;
}

export async function printSlip(inquiry: Inquiry, shop: ShopData): Promise<void> {
  const html = generateSlipHTML(inquiry, shop);
  await Print.printAsync({ html });
}

export async function shareSlipAsPDF(inquiry: Inquiry, shop: ShopData): Promise<void> {
  const html = generateSlipHTML(inquiry, shop);
  const { uri } = await Print.printToFileAsync({ html, width: 220 });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Slip #${inquiry.slipNumber}`,
  });
}
