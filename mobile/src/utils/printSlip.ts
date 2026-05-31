import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { Inquiry } from '@/types/inquiry';
import type { ShopData } from '@/context/ShopContext';
import { printHtmlOnWeb } from '@/utils/webExport';

export function generateSlipHTML(inquiry: Inquiry, shop: ShopData): string {
  const upiInfo = shop.upiId ? `GPay/Paytm: ${shop.upiId}` : shop.upiApps.join('/');
  const cartageRow =
    inquiry.cartageAmount > 0
      ? `<tr><td colspan="5">Cartage</td><td class="right">${inquiry.cartageAmount.toFixed(0)}</td></tr>`
      : '';
  const bardanaRow =
    inquiry.bardanaAmount > 0
      ? `<tr><td colspan="5">Bardana</td><td class="right">${inquiry.bardanaAmount.toFixed(0)}</td></tr>`
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
    margin: 0;
  }
  html, body { margin: 0; padding: 0; width: 80mm; min-width: 80mm; background: #fff; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    background: #fff;
    color: #000;
    width: 80mm;
    max-width: 80mm;
    min-height: 100vh;
  }
  .receipt {
    width: 80mm;
    min-width: 80mm;
    padding: 3mm;
    page-break-inside: avoid;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .firm-name {
    font-size: 17px;
    font-weight: bold;
    text-align: center;
    margin: 4px 0 2px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .small { font-size: 10px; color: #444; }
  .divider-solid { border: none; border-top: 1px solid #000; margin: 5px 0; }
  .divider-dash { border: none; border-top: 1px dashed #888; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 2px; vertical-align: top; font-size: 11px; }
  .header-row td { font-weight: bold; font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 3px; }
  .net-row td {
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    font-size: 13px;
    font-weight: bold;
    padding: 3px 2px;
  }
  .phones-row {
    display: table;
    width: 100%;
  }
  .phones-row span {
    display: table-cell;
    font-size: 10px;
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
  .footer-row span { display: table-cell; font-size: 10px; }
  .footer-row span:last-child { text-align: right; }
  .thank-you { font-size: 15px; font-weight: bold; text-align: center; margin: 5px 0 2px; }
  .stamp-row {
    display: table;
    width: 100%;
    margin-top: 6px;
  }
  .stamp-row span { display: table-cell; font-size: 11px; font-weight: bold; }
  .stamp-row span:last-child { text-align: right; font-size: 10px; color: #666; }
</style>
</head>
<body>
<div class="receipt">

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
      <td>#</td>
      <td>Item/Fruit</td>
      <td>Grade</td>
      <td>Weight (kg)</td>
      <td>Rate</td>
      <td class="right">Amt</td>
    </tr>
    <tr>
      <td>1</td>
      <td><strong>${shop.commodity}</strong><br><span class="small">${inquiry.sacks}&times;${inquiry.weightPerSack}kg</span></td>
      <td>${inquiry.gradeName || inquiry.grade}</td>
      <td>${inquiry.totalWeight}</td>
      <td>&#8377;${inquiry.ratePerKg}</td>
      <td class="right">${inquiry.grossAmount.toFixed(0)}</td>
    </tr>
    <tr><td colspan="5">APMC</td><td class="right">${inquiry.apmcAmount.toFixed(0)}</td></tr>
    ${bardanaRow}
    ${cartageRow}
    <tr class="net-row">
      <td colspan="5">NET AMOUNT / कुल राशि</td>
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
    <span>वजन की जिम्मेदारी माल उठने तक है</span>
  </div>

</div>
</body>
</html>`;
}

export async function printSlip(inquiry: Inquiry, shop: ShopData): Promise<void> {
  const html = generateSlipHTML(inquiry, shop);

  if (Platform.OS === 'web') {
    // expo-print on web calls window.print() on the current page.
    // Instead, inject the receipt HTML into a hidden iframe and print only that.
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: 'none',
      visibility: 'hidden',
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 300);
    }
    return;
  }

  await Print.printAsync({ html, width: 302 });
}

export async function shareSlipAsPDF(inquiry: Inquiry, shop: ShopData): Promise<void> {
  const html = generateSlipHTML(inquiry, shop);
  if (Platform.OS === 'web') {
    await printHtmlOnWeb(html, `Slip #${inquiry.slipNumber}`);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, width: 302 });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Slip #${inquiry.slipNumber}`,
  });
}
