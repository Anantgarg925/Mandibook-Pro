import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  CheckCircle,
  MessageCircle,
  Users,
  Printer,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import { Colors } from '@/lib/theme';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import {
  generateCustomerMessage,
  generateThekedaarMessage,
  openWhatsApp,
} from '@/utils/whatsapp';
import { printSlip, shareSlipAsPDF } from '@/utils/printSlip';
import type { Inquiry } from '@/types/inquiry';

const BARCODE_WIDTHS = [1, 2, 1, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2, 1, 2, 3];

export default function SlipPreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shop } = useShop();
  const [printing, setPrinting] = useState(false);
  const insets = useSafeAreaInsets();

  const { data: inquiry } = useQuery({
    queryKey: ['inquiry', shop?.shopId, id],
    queryFn: () => api.get<Inquiry>(`/api/inquiries/${id}?shopId=${shop!.shopId}`),
    enabled: !!shop?.shopId && !!id,
    refetchInterval: 10000,
  });

  const handlePrint = async () => {
    if (!inquiry || !shop) return;
    setPrinting(true);
    try {
      await printSlip(inquiry, shop);
    } catch {
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
        style={{ flex: 1, backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center' }}
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
      {/* Header bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}
      >
        <Pressable testID="back-from-slip" onPress={() => router.back()}>
          <ArrowLeft size={22} color="#071e27" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#071e27' }}>
            Delivery Slip
          </Text>
          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
            #{inquiry.slipNumber}
          </Text>
        </View>

        <Pressable testID="share-pdf" onPress={handleShare} style={{ marginLeft: 8 }}>
          <Share2 size={20} color="#64748B" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Thermal Receipt Card */}
        <View
          testID="slip-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 6,
            marginBottom: 20,
          }}
        >
          {/* Top jagged edge */}
          <View
            style={{
              height: 12,
              backgroundColor: '#FFFFFF',
              borderTopWidth: 3,
              borderTopColor: '#E8E8E8',
              borderStyle: 'dotted',
              borderRadius: 2,
            }}
          />

          {/* Receipt body */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            {/* Phones row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: '#64748B',
                  letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                }}
              >
                M: {shop.phone1}
              </Text>
              {shop.phone2 ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: '#64748B',
                    letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                  }}
                >
                  M: {shop.phone2}
                </Text>
              ) : null}
            </View>

            {/* Firm name */}
            <Text
              style={{
                textAlign: 'center',
                fontSize: 20,
                fontWeight: '700',
                color: '#00450d',
                letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                marginBottom: 4,
              }}
            >
              {shop.firmName}
            </Text>

            {/* Address */}
            <Text
              style={{
                textAlign: 'center',
                fontSize: 11,
                color: '#64748B',
                lineHeight: 18,
              }}
            >
              {shop.address}
              {'\n'}
              {shop.city}
            </Text>

            {/* UPI line */}
            {upiLine ? (
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 11,
                  color: '#64748B',
                  marginTop: 2,
                }}
              >
                {upiLine}
              </Text>
            ) : null}

            {/* Dashed divider */}
            <Text
              style={{
                color: '#cbd5e1',
                fontSize: 10,
                letterSpacing: Platform.OS === 'android' ? 2 : 4,
                marginVertical: 12,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {'- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'}
            </Text>

            {/* Bill meta row */}
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#071e27' }}>
                No. {inquiry.slipNumber}
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B' }}>
                Date: {toIndianDate(inquiry.date)}
              </Text>
            </View>

            {/* Customer row */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#071e27' }}>
              M/s. {inquiry.customerName}
            </Text>
            {inquiry.customerPhone ? (
              <Text style={{ fontSize: 11, color: '#64748B' }}>{inquiry.customerPhone}</Text>
            ) : null}

            {/* Solid divider */}
            <View
              style={{ height: 1, backgroundColor: '#071e27', marginVertical: 8 }}
            />

            {/* Table header */}
            <View
              style={{
                flexDirection: 'row',
                paddingBottom: 6,
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
              }}
            >
              <Text
                style={{
                  flex: 2,
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                }}
              >
                Item
              </Text>
              <Text
                style={{
                  width: 60,
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                  textAlign: 'right',
                }}
              >
                Qty
              </Text>
              <Text
                style={{
                  width: 50,
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                  textAlign: 'right',
                }}
              >
                Rate
              </Text>
              <Text
                style={{
                  width: 70,
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                  textAlign: 'right',
                }}
              >
                Total
              </Text>
            </View>

            {/* Grade row */}
            <View
              style={{
                flexDirection: 'row',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
              }}
            >
              <View style={{ flex: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#071e27' }}>
                  {inquiry.grade}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>{inquiry.gradeName}</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  {inquiry.sacks}x{inquiry.weightPerSack}kg
                </Text>
              </View>
              <Text style={{ width: 60, fontSize: 13, color: '#071e27', textAlign: 'right' }}>
                {inquiry.totalWeight}kg
              </Text>
              <Text style={{ width: 50, fontSize: 13, color: '#071e27', textAlign: 'right' }}>
                {'\u20B9'}{inquiry.ratePerKg}
              </Text>
              <Text
                style={{
                  width: 70,
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#00450d',
                  textAlign: 'right',
                }}
              >
                {inquiry.grossAmount.toFixed(0)}
              </Text>
            </View>

            {/* APMC charge */}
            <View
              style={{
                flexDirection: 'row',
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
              }}
            >
              <Text style={{ flex: 1, fontSize: 12, color: '#64748B' }}>APMC</Text>
              <Text style={{ width: 70, fontSize: 12, color: '#ba1a1a', textAlign: 'right' }}>
                {Math.round(inquiry.apmcAmount)}
              </Text>
            </View>

            {/* Bardana charge */}
            {inquiry.bardanaAmount > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <Text style={{ flex: 1, fontSize: 12, color: '#64748B' }}>Bardana</Text>
                <Text style={{ width: 70, fontSize: 12, color: '#ba1a1a', textAlign: 'right' }}>
                  {Math.round(inquiry.bardanaAmount)}
                </Text>
              </View>
            ) : null}

            {/* Cartage charge */}
            {inquiry.cartageAmount > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <Text style={{ flex: 1, fontSize: 12, color: '#64748B' }}>Cartage</Text>
                <Text style={{ width: 70, fontSize: 12, color: '#ba1a1a', textAlign: 'right' }}>
                  {Math.round(inquiry.cartageAmount)}
                </Text>
              </View>
            ) : null}

            {/* Net Amount box */}
            <View
              style={{
                backgroundColor: 'rgba(27,94,32,0.08)',
                borderRadius: 10,
                padding: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 10,
                marginBottom: 4,
                borderWidth: 1,
                borderColor: 'rgba(0,69,13,0.12)',
              }}
            >
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1b5e20' }}>
                  Net Amount
                </Text>
                <Text style={{ fontSize: 11, color: '#1b5e20', opacity: 0.7 }}>
                  {'\u0915\u0941\u0932 \u0930\u093E\u0936\u093F'}
                </Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#1b5e20' }}>
                {toIndianCurrency(inquiry.netAmount)}
              </Text>
            </View>

            {/* Payment + Truck row */}
            <View style={{ marginTop: 12, gap: 4 }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                Payment: {inquiry.paymentMode}
                {inquiry.upiRef ? ` [${inquiry.upiRef}]` : null}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                Truck: {inquiry.truckNumber}
              </Text>
            </View>

            {/* Dashed divider */}
            <Text
              style={{
                color: '#cbd5e1',
                fontSize: 10,
                letterSpacing: Platform.OS === 'android' ? 2 : 4,
                marginVertical: 12,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {'- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'}
            </Text>

            {/* Footer */}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: '#00450d',
                  textAlign: 'center',
                }}
              >
                {'\u0927\u0928\u094D\u092F\u0935\u093E\u0926'}
              </Text>
              <Text style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
                Thank You for your business!
              </Text>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <CheckCircle size={14} color="#00450d" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#00450d' }}>
                  Authorized {'\u2713'}
                </Text>
              </View>
            </View>

            {/* Barcode decoration */}
            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                gap: 1.5,
                height: 40,
                opacity: 0.15,
                overflow: 'hidden',
                width: '100%',
              }}
            >
              {BARCODE_WIDTHS.map((w, i) => (
                <View
                  key={i}
                  style={{
                    width: Math.max(1, w * 2.5),
                    height: '100%',
                    backgroundColor: '#071e27',
                  }}
                />
              ))}
            </View>
          </View>

          {/* Bottom jagged edge */}
          <View
            style={{
              height: 12,
              backgroundColor: '#FFFFFF',
              borderTopWidth: 3,
              borderTopColor: '#E8E8E8',
              borderStyle: 'dotted',
              borderRadius: 2,
            }}
          />
        </View>

        {/* Action Grid */}
        {/* Row 1: WhatsApp buttons */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            testID="wa-customer"
            onPress={() =>
              openWhatsApp(inquiry.customerPhone, generateCustomerMessage(inquiry, shop))
            }
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 14,
              height: 60,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              gap: 10,
            })}
          >
            <MessageCircle size={22} color="#25D366" />
            <View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#071e27' }}>Customer</Text>
              <Text style={{ fontSize: 11, color: '#64748B' }}>
                {'\u0917\u094D\u0930\u093E\u0939\u0915'}
              </Text>
            </View>
          </Pressable>

          <Pressable
            testID="wa-thekedaar"
            onPress={() => openWhatsApp(shop.phone1, generateThekedaarMessage(inquiry, shop))}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 14,
              height: 60,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              gap: 10,
            })}
          >
            <Users size={22} color="#25D366" />
            <View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#071e27' }}>Thekedaar</Text>
              <Text style={{ fontSize: 11, color: '#64748B' }}>
                {'\u0920\u0947\u0915\u0947\u0926\u093E\u0930'}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Row 2: Print Receipt */}
        <Pressable
          testID="print-slip"
          onPress={handlePrint}
          disabled={printing}
          style={({ pressed }) => ({
            marginTop: 10,
            backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 14,
            height: 60,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          })}
        >
          <Printer size={22} color="#41493e" />
          <View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#071e27' }}>
              Print Receipt
            </Text>
            <Text style={{ fontSize: 11, color: '#64748B' }}>
              {'\u0930\u0938\u0940\u0926 \u092A\u094D\u0930\u093F\u0902\u091F \u0915\u0930\u0947\u0902'}
            </Text>
          </View>
        </Pressable>
      </ScrollView>

      {/* Fixed Bottom CTA */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          padding: 16,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <Pressable
          testID="share-pdf-bottom"
          onPress={handleShare}
          disabled={printing}
          style={({ pressed }) => ({
            height: 56,
            backgroundColor: printing ? '#E5E7EB' : pressed ? '#003a0b' : '#00450d',
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          })}
        >
          <CheckCircle size={22} color="#FFFFFF" />
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
              Authorize Next
            </Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
              {'\u0905\u0917\u0932\u093E \u0905\u0927\u093F\u0915\u0943\u0924 \u0915\u0930\u0947\u0902'}
            </Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
