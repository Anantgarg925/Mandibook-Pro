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
  const bardanaRow =
    inquiry.bardanaAmount > 0
      ? `<tr><td>Bardana</td><td></td><td></td><td class="right">${inquiry.bardanaAmount.toFixed(0)}</td></tr>`
      : '';
  const dateStr = new Date(inquiry.date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @page {
    size: 80mm auto;
    margin: 4mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    background: #fff;
    color: #000;
    width: 72mm;
    max-width: 72mm;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .firm-name {
    font-size: 15px;
    font-weight: bold;
    text-align: center;
    margin: 4px 0 2px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .small { font-size: 9px; color: #444; }
  .divider-solid { border: none; border-top: 1px solid #000; margin: 4px 0; }
  .divider-dash { border: none; border-top: 1px dashed #888; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 2px; vertical-align: top; font-size: 10px; }
  .header-row td { font-weight: bold; font-size: 9px; border-bottom: 1px solid #000; padding-bottom: 3px; }
  .net-row td {
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    font-size: 12px;
    font-weight: bold;
    padding: 3px 2px;
  }
  .phones-row {
    display: table;
    width: 100%;
  }
  .phones-row span {
    display: table-cell;
    font-size: 9px;
    color: #444;
  }
  .phones-row span:last-child { text-align: right; }
  .meta-row {
    display: table;
    width: 100%;
    margin: 2px 0;
  }
  .meta-row span {
    display: table-cell;
  }
  .meta-row span:last-child { text-align: right; font-size: 9px; color: #555; }
  .footer-row {
    display: table;
    width: 100%;
    margin-top: 2px;
  }
  .footer-row span { display: table-cell; font-size: 9px; }
  .footer-row span:last-child { text-align: right; }
  .thank-you { font-size: 13px; font-weight: bold; text-align: center; margin: 4px 0 2px; }
  .stamp-row {
    display: table;
    width: 100%;
    margin-top: 6px;
  }
  .stamp-row span { display: table-cell; font-size: 10px; font-weight: bold; }
  .stamp-row span:last-child { text-align: right; font-size: 9px; color: #666; }
</style>
</head>
<body>

  <div class="phones-row">
    <span>M: ${shop.phone1}</span>
    <span>${shop.phone2 ? 'M: ' + shop.phone2 : ''}</span>
  </div>

  <div class="firm-name">${shop.firmName}</div>
  <div class="center small">${shop.address}</div>
  <div class="center small">${shop.city}</div>
  ${upiInfo ? `<div class="center small">${upiInfo}</div>` : ''}

  <hr class="divider-solid">

  <div class="meta-row">
    <span class="bold">No. ${inquiry.slipNumber}</span>
    <span>Date: ${dateStr}</span>
  </div>

  <div style="margin-top:2px;">
    M/s. <strong>${inquiry.customerName}</strong>
  </div>
  ${inquiry.customerPhone ? `<div class="small">${inquiry.customerPhone}</div>` : ''}

  <hr class="divider-solid">

  <table>
    <tr class="header-row">
      <td>Description</td>
      <td>Wt</td>
      <td>Rate</td>
      <td class="right">Amt</td>
    </tr>
    <tr>
      <td>
        <strong>${inquiry.grade}</strong><br>
        <span class="small">${inquiry.gradeName}</span><br>
        <span class="small">${inquiry.sacks}&times;${inquiry.weightPerSack}kg</span>
      </td>
      <td>${inquiry.totalWeight}kg</td>
      <td>&#8377;${inquiry.ratePerKg}</td>
      <td class="right">${inquiry.grossAmount.toFixed(0)}</td>
    </tr>
    <tr><td>APMC</td><td></td><td></td><td class="right">${inquiry.apmcAmount.toFixed(0)}</td></tr>
    ${bardanaRow}
    ${cartageRow}
    <tr class="net-row">
      <td colspan="3">NET AMOUNT / कुल राशि</td>
      <td class="right">&#8377;${inquiry.netAmount.toFixed(0)}</td>
    </tr>
  </table>

  <hr class="divider-dash">

  <div class="small">Payment: <strong>${inquiry.paymentMode}${inquiry.upiRef ? ' [' + inquiry.upiRef + ']' : ''}</strong></div>
  <div class="small">Truck: ${inquiry.truckNumber}</div>

  <hr class="divider-dash">

  <div class="stamp-row">
    <span>Authorized &#10003;</span>
    <span>[STAMP]</span>
  </div>

  <hr class="divider-dash">

  <div class="thank-you">धन्यवाद!</div>
  <div class="center small">Thank You for your business!</div>

  <div class="footer-row" style="margin-top:4px;">
    <span>E.&amp;O.E.</span>
    <span>वजन की जिम्मेदारी हमारी नहीं</span>
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
  const { uri } = await Print.printToFileAsync({ html, width: 302 });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Slip #${inquiry.slipNumber}`,
  });
}
