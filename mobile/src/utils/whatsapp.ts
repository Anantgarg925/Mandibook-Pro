import { Linking, Alert } from 'react-native';
import type { Inquiry, Buyer } from '@/types/inquiry';
import type { ShopData } from '@/context/ShopContext';
import { toIndianCurrency } from '@/lib/formatters';

export function generateCustomerMessage(inquiry: Inquiry, shop: ShopData): string {
  const upiLine =
    shop.upiApps.length > 0 || shop.upiId
      ? `\nUPI: ${shop.upiId || shop.upiApps.join('/')}` : '';

  return (
    `🍊 *${shop.firmName}* - बिल कन्फर्म ✅\n\n` +
    `बिल नं: #${inquiry.slipNumber}\n` +
    `नाम: ${inquiry.customerName}\n\n` +
    `माल: ${inquiry.gradeName}\n` +
    `${inquiry.sacks} बोरी × ${inquiry.weightPerSack} kg = *${inquiry.totalWeight} kg*\n` +
    `रेट: ₹${inquiry.ratePerKg}/kg\n` +
    `*कुल: ${toIndianCurrency(inquiry.grossAmount)}*\n\n` +
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
  return (
    `*${shop.firmName}* — माल पहुंचने की सूचना\n\n` +
    `Slip #${inquiry.slipNumber} | ${inquiry.truckNumber}\n` +
    `ग्रेड: ${inquiry.grade} (${inquiry.gradeName})\n` +
    `${inquiry.sacks} बोरी × ${inquiry.weightPerSack} kg = ${inquiry.totalWeight} kg\n` +
    `रेट: ₹${inquiry.ratePerKg}/kg | नेट: ${toIndianCurrency(inquiry.netAmount)}\n\n` +
    `भुगतान: ${inquiry.paymentMode}${inquiry.upiRef ? ` [${inquiry.upiRef}]` : ''}\n` +
    `धन्यवाद!`
  );
}

export function generateBalanceMessage(buyer: Buyer, shop: ShopData): string {
  const bal = toIndianCurrency(buyer.outstandingBalance);
  return `नमस्ते ${buyer.name} जी,\n\n${shop.firmName} में आपका बकाया:\n*${bal}*\n\nकृपया जल्द भुगतान करें।\nधन्यवाद 🙏`;
}

export async function openWhatsApp(phone: string, message: string): Promise<void> {
  const clean = phone.replace(/\D/g, '');
  const number = clean.startsWith('91') ? clean : `91${clean}`;
  const url = `whatsapp://send?phone=${number}&text=${encodeURIComponent(message)}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('WhatsApp नहीं मिला', 'WhatsApp इंस्टॉल नहीं है');
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Error', 'WhatsApp नहीं खुल सका');
  }
}
