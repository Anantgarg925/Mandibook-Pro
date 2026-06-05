import { Linking, Alert } from 'react-native';
import type { Inquiry, Buyer } from '@/types/inquiry';
import type { ShopData } from '@/context/ShopContext';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';

export function generateCustomerMessage(inquiry: Inquiry, shop: ShopData): string {
  const upiLine =
    shop.upiApps.length > 0 || shop.upiId
      ? `\nUPI: ${shop.upiId || shop.upiApps.join('/')}` : '';

  const entries = (inquiry.chargeSnapshot as any)?.entries || [inquiry];
  const itemsText = entries.map((entry: any) => 
    `माल: ${entry.gradeName || entry.grade}\n` +
    `${entry.sacks} बोरी × ${entry.weightPerSack} kg = *${entry.totalWeight} kg*\n` +
    `रेट: ₹${entry.ratePerKg}/kg\n` +
    `*कुल: ${toIndianCurrency(entry.grossAmount)}*`
  ).join('\n\n');

  return (
    `🍊 *${shop.firmName}* - बिल कन्फर्म ✅\n\n` +
    `बिल नं: #${inquiry.slipNumber}\n` +
    `नाम: ${inquiry.customerName}\n\n` +
    `${itemsText}\n\n` +
    `APMC: ${toIndianCurrency(inquiry.apmcAmount)}\n` +
    `बरदाना: ${toIndianCurrency(inquiry.bardanaAmount)}\n` +
    `*जमा: ${toIndianCurrency(inquiry.netAmount)}*\n\n` +
    `भुगतान: ${inquiry.paymentMode} ✓\n\n` +
    `📍 ${shop.address}, ${shop.city}\n` +
    `📞 ${shop.phone1}${upiLine}\n\n` +
    `धन्यवाद! 🙏`
  );
}

export function generateThekedaarMessage(inquiry: Inquiry, shop: ShopData): string {
  const entries = (inquiry.chargeSnapshot as any)?.entries || [inquiry];
  const itemsText = entries.map((entry: any) => 
    `ग्रेड: ${entry.gradeName || entry.grade}\n` +
    `${entry.sacks} बोरी × ${entry.weightPerSack} kg = ${entry.totalWeight} kg\n` +
    `रेट: ₹${entry.ratePerKg}/kg`
  ).join('\n\n');

  const truckLine = inquiry.truckNumber && inquiry.truckNumber !== 'Agent Stock' 
    ? ` | ${inquiry.truckNumber}` 
    : '';

  return (
    `*${shop.firmName}* — माल पहुंचने की सूचना\n\n` +
    `Slip #${inquiry.slipNumber}${truckLine}\n` +
    `${itemsText}\n\n` +
    `नेट: ${toIndianCurrency(inquiry.netAmount)}\n` +
    `भुगतान: ${inquiry.paymentMode}${inquiry.upiRef ? ` [${inquiry.upiRef}]` : ''}\n` +
    `धन्यवाद!`
  );
}

export function generateBalanceMessage(buyer: Buyer, shop: ShopData): string {
  const bal = toIndianCurrency(buyer.outstandingBalance);
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yy = String(today.getFullYear()).slice(-2);
  const dateStr = `${dd}/${mm}/${yy}`;

  const lastPaymentLine = buyer.lastPaymentDate
    ? `\nआखिरी भुगतान: ${toIndianCurrency(buyer.lastPaymentAmount ?? 0)} on ${toIndianDate(buyer.lastPaymentDate)}`
    : '';

  return (
    `📒 *${shop.firmName}* — बकाया सूचना / Balance Due\n\n` +
    `नाम: ${buyer.name} (${buyer.code})\n` +
    `दिनांक: ${dateStr}\n\n` +
    `*बकाया राशि: ${bal}*\n` +
    `${lastPaymentLine}\n\n` +
    `कृपया जल्द भुगतान करें।\n` +
    `📞 ${shop.phone1}\n` +
    `धन्यवाद! 🙏`
  );
}

export async function openWhatsApp(phone: string, message: string): Promise<void> {
  const phones = phone.split(',').map(p => p.replace(/\D/g, '')).filter(Boolean);
  if (phones.length === 0) {
    Alert.alert('Mobile number missing', 'इस बिल में मोबाइल नंबर सेव नहीं है');
    return;
  }

  const launchWA = async (p: string) => {
    const number = p.startsWith('91') ? p : `91${p}`;
    const text = encodeURIComponent(message);
    const appUrl = `whatsapp://send?phone=${number}&text=${text}`;
    const webUrl = `https://wa.me/${number}?text=${text}`;

    try {
      try {
        await Linking.openURL(appUrl);
      } catch {
        await Linking.openURL(webUrl);
      }
    } catch {
      Alert.alert('Error', 'WhatsApp नहीं खुल सका');
    }
  };

  if (phones.length > 1) {
    Alert.alert(
      'Select Number',
      'Which number would you like to send to?',
      [
        { text: phones[0], onPress: () => launchWA(phones[0]) },
        { text: phones[1], onPress: () => launchWA(phones[1]) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  } else {
    await launchWA(phones[0]);
  }
}
