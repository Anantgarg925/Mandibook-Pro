import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import { generateCustomerMessage, generateThekedaarMessage, openWhatsApp } from '@/utils/whatsapp';
import { printSlip, shareSlipAsPDF } from '@/utils/printSlip';
import type { Inquiry } from '@/types/inquiry';

const COL: Record<string, DimensionValue> = { desc: '38%', wt: '16%', rate: '16%', amt: '30%' };

function TableCell({
  value,
  align = 'left',
  bold,
  small,
}: {
  value: string;
  align?: 'left' | 'right' | 'center';
  bold?: boolean;
  small?: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: small ? 10 : FontSize.xs,
        fontWeight: bold ? '700' : '400',
        color: Colors.text,
        textAlign: align,
        lineHeight: 16,
      }}
    >
      {value}
    </Text>
  );
}

function SlipDivider({ dashed }: { dashed?: boolean }) {
  return (
    <View
      style={{
        height: 1,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        borderStyle: dashed ? 'dashed' : 'solid',
        marginVertical: 6,
      }}
    />
  );
}

export default function SlipPreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shop } = useShop();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!shop?.shopId || !id) return;
    const unsub = onSnapshot(doc(db, 'shops', shop.shopId, 'inquiries', id), (snap) => {
      if (snap.exists()) setInquiry({ id: snap.id, ...snap.data() } as Inquiry);
    });
    return unsub;
  }, [shop?.shopId, id]);

  const handlePrint = async () => {
    if (!inquiry || !shop) return;
    setPrinting(true);
    try {
      await printSlip(inquiry, shop);
    } catch (e) {
      Alert.alert('Print Error', 'Could not print. Try Share as PDF instead.');
    } finally {
      setPrinting(false);
    }
  };

  const handleShare = async () => {
    if (!inquiry || !shop) return;
    setPrinting(true);
    try {
      await shareSlipAsPDF(inquiry, shop);
    } catch {
      Alert.alert('Share Error', 'Could not generate PDF.');
    } finally {
      setPrinting(false);
    }
  };

  if (!inquiry || !shop) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}
        edges={['top']}
      >
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const upiLine =
    shop.upiApps.length > 0 || shop.upiId
      ? `GPay/Paytm: ${shop.upiId || shop.upiApps.join('/')}`
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#E8E8E8' }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Pressable testID="back-from-slip" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.md, fontWeight: '800', color: Colors.text }}>
          Slip Preview #{inquiry.slipNumber}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Slip card */}
        <View
          testID="slip-card"
          style={{
            backgroundColor: Colors.surface,
            borderRadius: Radius.sm,
            padding: Spacing.md,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          {/* Phones row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 11, color: Colors.textSecond }}>M:{shop.phone1}</Text>
            {shop.phone2 ? (
              <Text style={{ fontSize: 11, color: Colors.textSecond }}>M:{shop.phone2}</Text>
            ) : null}
          </View>

          {/* Firm header */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: '900',
              color: Colors.primary,
              textAlign: 'center',
              letterSpacing: 0.3,
            }}
          >
            {shop.firmName}
          </Text>
          <Text style={{ fontSize: 11, color: Colors.textSecond, textAlign: 'center', marginTop: 2 }}>
            {shop.address}
          </Text>
          <Text style={{ fontSize: 11, color: Colors.textSecond, textAlign: 'center' }}>
            {shop.city}
          </Text>
          {upiLine ? (
            <Text style={{ fontSize: 11, color: Colors.textSecond, textAlign: 'center' }}>
              {upiLine}
            </Text>
          ) : null}

          <SlipDivider />

          {/* Bill meta */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>
              No. {inquiry.slipNumber}
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
              Date: {toIndianDate(inquiry.date)}
            </Text>
          </View>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>
            M/s. {inquiry.customerName}
          </Text>
          {inquiry.customerPhone ? (
            <Text style={{ fontSize: 11, color: Colors.textSecond }}>📞 {inquiry.customerPhone}</Text>
          ) : null}

          <SlipDivider />

          {/* Table header */}
          <View style={{ flexDirection: 'row', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: Colors.text }}>
            <Text style={{ width: COL.desc, fontSize: FontSize.xs, fontWeight: '700', color: Colors.text }}>Description</Text>
            <Text style={{ width: COL.wt, fontSize: FontSize.xs, fontWeight: '700', color: Colors.text, textAlign: 'right' }}>Wt</Text>
            <Text style={{ width: COL.rate, fontSize: FontSize.xs, fontWeight: '700', color: Colors.text, textAlign: 'right' }}>Rate</Text>
            <Text style={{ width: COL.amt, fontSize: FontSize.xs, fontWeight: '700', color: Colors.text, textAlign: 'right' }}>Amt</Text>
          </View>

          {/* Grade row */}
          <View style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <View style={{ width: COL.desc }}>
              <TableCell value={`${inquiry.grade} (${inquiry.gradeName})`} bold />
              <TableCell value={`${inquiry.sacks}×${inquiry.weightPerSack}kg`} small />
            </View>
            <View style={{ width: COL.wt, alignItems: 'flex-end' }}>
              <TableCell value={`${inquiry.totalWeight}kg`} align="right" />
            </View>
            <View style={{ width: COL.rate, alignItems: 'flex-end' }}>
              <TableCell value={`₹${inquiry.ratePerKg}`} align="right" />
            </View>
            <View style={{ width: COL.amt, alignItems: 'flex-end' }}>
              <TableCell value={String(Math.round(inquiry.grossAmount))} align="right" bold />
            </View>
          </View>

          {/* Charges rows */}
          {[
            ['APMC', inquiry.apmcAmount],
            ['Bardana', inquiry.bardanaAmount],
            ...(inquiry.cartageAmount > 0 ? [['Cartage', inquiry.cartageAmount]] : []),
          ].map(([label, val]) => (
            <View key={String(label)} style={{ flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
              <Text style={{ flex: 1, fontSize: FontSize.xs, color: Colors.textSecond }}>{String(label)}</Text>
              <Text style={{ width: COL.amt, fontSize: FontSize.xs, color: Colors.danger, textAlign: 'right' }}>
                {String(Math.round(Number(val)))}
              </Text>
            </View>
          ))}

          {/* Net amount */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 6,
              borderTopWidth: 2,
              borderTopColor: Colors.text,
              borderBottomWidth: 2,
              borderBottomColor: Colors.text,
              marginTop: 2,
            }}
          >
            <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: Colors.text }}>
              NET AMOUNT
            </Text>
            <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: Colors.success }}>
              {toIndianCurrency(inquiry.netAmount)}
            </Text>
          </View>

          <SlipDivider />

          <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
            Payment: <Text style={{ fontWeight: '700', color: Colors.text }}>{inquiry.paymentMode}</Text>
            {inquiry.upiRef ? ` [${inquiry.upiRef}]` : null}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
            Truck: {inquiry.truckNumber}
          </Text>

          <SlipDivider />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.success }}>
              Authorized ✓
            </Text>
            <View
              style={{
                width: 72,
                height: 36,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 9, color: Colors.border }}>STAMP</Text>
            </View>
          </View>

          <SlipDivider dashed />

          <Text style={{ fontSize: 11, color: Colors.textSecond, textAlign: 'center' }}>
            वजन की जिम्मेदारी हमारी नहीं
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={{ fontSize: 11, color: Colors.textSecond }}>E.&O.E.</Text>
            <Text style={{ fontSize: 11, color: Colors.textSecond }}>धन्यवाद! 🙏</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          padding: Spacing.md,
          gap: Spacing.sm,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 10,
        }}
      >
        {/* Row 1: WhatsApp buttons */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Pressable
            testID="wa-customer"
            onPress={() => openWhatsApp(inquiry.customerPhone, generateCustomerMessage(inquiry, shop))}
            style={({ pressed }) => ({
              flex: 1,
              height: 48,
              borderRadius: Radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? '#1B5E20' : '#25D366',
            })}
          >
            <Text style={{ fontSize: FontSize.xs, color: '#FFF', fontWeight: '700' }}>
              📱 WhatsApp ग्राहक
            </Text>
          </Pressable>
          <Pressable
            testID="wa-thekedaar"
            onPress={() =>
              openWhatsApp(shop.phone1, generateThekedaarMessage(inquiry, shop))
            }
            style={({ pressed }) => ({
              flex: 1,
              height: 48,
              borderRadius: Radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? '#1B5E20' : '#25D366',
            })}
          >
            <Text style={{ fontSize: FontSize.xs, color: '#FFF', fontWeight: '700' }}>
              📱 WhatsApp ठेकेदार
            </Text>
          </Pressable>
        </View>

        {/* Row 2: Print + Next */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Pressable
            testID="print-slip"
            onPress={handlePrint}
            disabled={printing}
            style={({ pressed }) => ({
              flex: 1,
              height: 48,
              borderRadius: Radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: printing ? Colors.border : pressed ? '#E55A00' : Colors.primary,
            })}
          >
            <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>
              {printing ? '⏳' : '🖨️'} Print Slip
            </Text>
          </Pressable>
          <Pressable
            testID="share-pdf"
            onPress={handleShare}
            disabled={printing}
            style={({ pressed }) => ({
              flex: 1,
              height: 48,
              borderRadius: Radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: Colors.border,
              backgroundColor: pressed ? Colors.background : Colors.surface,
            })}
          >
            <Text style={{ fontSize: FontSize.sm, color: Colors.text, fontWeight: '700' }}>
              ⬅ Next Bill
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
