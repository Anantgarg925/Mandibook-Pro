import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Share2, CheckCircle, MessageCircle, Users, Printer, ArrowLeft, Settings, Image as ImageIcon } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { supabase, mapInquiry } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import { Colors } from '@/lib/theme';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import { printSlip, shareSlipAsPDF } from '@/utils/printSlip';
import { useMemberMode } from '@/hooks/useMemberMode';
import { archiveQueryOptions } from '@/lib/queryOptions';
import {
  generateCustomerMessage,
  generateThekedaarMessage,
  openWhatsApp,
} from '@/utils/whatsapp';
import type { Inquiry } from '@/types/inquiry';

const BARCODE_WIDTHS = [1, 2, 1, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2, 1, 2, 3];

export default function SlipPreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shop } = useShop();
  const [printing, setPrinting] = useState(false);
  const slipCardRef = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const isMemberMode = useMemberMode();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      if (isMemberMode) {
        router.replace('/member-dashboard' as any);
      } else {
        router.replace('/' as any);
      }
    }
  };

  useEffect(() => {
    if (isMemberMode === undefined) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [isMemberMode, router]);

  const { data: inquiry } = useQuery({
    queryKey: ['inquiry', shop?.shopId, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return mapInquiry(data as Record<string, unknown>);
    },
    enabled: !!shop?.shopId && !!id,
    ...archiveQueryOptions,
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

  const handleShareImage = async () => {
    if (!slipCardRef.current) return;
    setPrinting(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', 'Image sharing is not available on this device.');
        return;
      }

      const uri = await captureRef(slipCardRef, {
        format: 'jpg',
        quality: 1,
        result: 'tmpfile',
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        UTI: 'public.jpeg',
        dialogTitle: `Share slip #${inquiry?.slipNumber ?? ''} image`,
      });
    } catch {
      Alert.alert('Share Error', 'Could not create slip image. Please try again.');
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
  const showAdminSlipActions = isMemberMode === false;
  const isWeb = Platform.OS === 'web';
  const footerBottomInset = isWeb ? 0 : insets.bottom;
  const footerHeight = showAdminSlipActions ? 56 + 16 + 16 + footerBottomInset : 0;
  const isReferenceSlip = inquiry.status !== 'CONFIRMED';
  const showFinalAmounts = !isReferenceSlip;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#E8E8E8' }} edges={['top', 'bottom']}>
      {/* Header bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: Colors.primary,
          borderBottomWidth: 0,
        }}
      >
        <Pressable testID="back-from-slip" onPress={goBack} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
            {isReferenceSlip ? 'Reference Slip' : 'Authorized Bill'}
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 1 }}>
            #{inquiry.slipNumber}
          </Text>
        </View>

        <Pressable
          testID="share-pdf"
          onPress={handleShare}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Share2 size={20} color="#FFFFFF" />
        </Pressable>
        {showAdminSlipActions ? (
          <Pressable
            testID="slip-settings"
            onPress={() => router.push('/settings' as any)}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Settings size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: footerHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Thermal Receipt Card */}
        <View
          ref={slipCardRef}
          testID="slip-card"
          collapsable={false}
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

            {isReferenceSlip ? (
              <View
                style={{
                  borderWidth: 2,
                  borderColor: '#7E5700',
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  marginTop: 10,
                  backgroundColor: '#FFF8E1',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#7E5700', textAlign: 'center' }}>
                  REFERENCE SLIP - NOT A FINAL BILL
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#7E5700', textAlign: 'center', marginTop: 2 }}>
                  संदर्भ पर्ची - अंतिम बिल नहीं
                </Text>
              </View>
            ) : null}

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
                  flex: 1,
                  fontSize: 10,
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
                  width: 44,
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                  textAlign: 'center',
                }}
              >
                Grade
              </Text>
              <Text
                style={{
                  width: 50,
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                  textAlign: 'center',
                }}
              >
                Pack
              </Text>
              <Text
                style={{
                  width: 46,
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                  textAlign: 'right',
                }}
              >
                Wt
              </Text>
              {showFinalAmounts ? (
                <>
                  <Text style={{ width: 44, fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>
                    Rate
                  </Text>
                  <Text
                    style={{
                      width: 58,
                      fontSize: 10,
                      fontWeight: '700',
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                      textAlign: 'right',
                    }}
                  >
                    Total
                  </Text>
                </>
              ) : null}
            </View>

            {/* Grade rows */}
            {((inquiry.chargeSnapshot as any)?.entries || [inquiry]).map((entry: any, index: number) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#071e27' }}>
                    {shop.commodity}
                  </Text>
                </View>
                <Text style={{ width: 44, fontSize: 12, color: '#071e27', textAlign: 'center' }}>
                  {entry.grade}
                </Text>
                <Text style={{ width: 50, fontSize: 12, color: '#071e27', textAlign: 'center' }}>
                  {entry.sacks}x{entry.weightPerSack}
                </Text>
                <Text style={{ width: 46, fontSize: 12, color: '#071e27', textAlign: 'right' }}>
                  {entry.totalWeight}kg
                </Text>
                {showFinalAmounts ? (
                  <>
                    <Text style={{ width: 44, fontSize: 13, color: '#071e27', textAlign: 'right' }}>
                      {'\u20B9'}{entry.ratePerKg}
                    </Text>
                    <Text
                      style={{
                        width: 58,
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#00450d',
                        textAlign: 'right',
                      }}
                    >
                      {entry.grossAmount.toFixed(0)}
                    </Text>
                  </>
                ) : null}
              </View>
            ))}

            {/* APMC charge */}
            {showFinalAmounts ? (
              <View
              style={{
                flexDirection: 'row',
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
              }}
            >
              <Text style={{ flex: 1, fontSize: 12, color: '#64748B' }}>APMC</Text>
              <Text style={{ width: 70, fontSize: 12, color: '#071e27', textAlign: 'right' }}>
                +{Math.round(inquiry.apmcAmount)}
              </Text>
              </View>
            ) : null}

            {/* Bardana charge */}
            {showFinalAmounts && inquiry.bardanaAmount > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <Text style={{ flex: 1, fontSize: 12, color: '#64748B' }}>Bardana</Text>
                <Text style={{ width: 70, fontSize: 12, color: '#071e27', textAlign: 'right' }}>
                  +{Math.round(inquiry.bardanaAmount)}
                </Text>
              </View>
            ) : null}

            {/* Cartage charge */}
            {showFinalAmounts && inquiry.cartageAmount > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <Text style={{ flex: 1, fontSize: 12, color: '#64748B' }}>Cartage</Text>
                <Text style={{ width: 70, fontSize: 12, color: '#071e27', textAlign: 'right' }}>
                  +{Math.round(inquiry.cartageAmount)}
                </Text>
              </View>
            ) : null}

            {/* Net Amount box */}
            {showFinalAmounts ? (
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
            ) : null}

            {/* Payment + Truck row */}
            <View style={{ marginTop: 12, gap: 4 }}>
              {showFinalAmounts ? (
                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  Payment: {inquiry.paymentMode}
                  {inquiry.upiRef ? ` [${inquiry.upiRef}]` : null}
                </Text>
              ) : (
                <Text style={{ fontSize: 12, color: '#7E5700', fontWeight: '800' }}>
                  Status: Pending Authorization
                </Text>
              )}
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
                {isReferenceSlip ? 'Working document for mandi floor use only.' : 'Thank You for your business!'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <CheckCircle size={14} color="#00450d" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#00450d' }}>
                  {isReferenceSlip ? 'Pending Authorization' : `Authorized \u2713`}
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

        {/* Action buttons */}
        <View style={{ gap: 10 }}>
          <SlipActionButton
            testID="wa-customer"
            icon={<MessageCircle size={22} color="#00450D" />}
            title="Customer WhatsApp"
            subtitle="ग्राहक"
            primary
            disabled={printing}
            onPress={() => openWhatsApp(inquiry.customerPhone, generateCustomerMessage(inquiry, shop))}
          />

          {showAdminSlipActions ? (
            <SlipActionButton
              testID="wa-thekedaar"
              icon={<Users size={22} color="#00450D" />}
              title="Thekedaar WhatsApp"
              subtitle="ठेकेदार"
              primary
              disabled={printing}
              onPress={() => openWhatsApp(shop.phone1, generateThekedaarMessage(inquiry, shop))}
            />
          ) : null}

          <SlipActionButton
            testID="share-slip-image"
            icon={<ImageIcon size={22} color={printing ? '#6B7280' : '#00450D'} />}
            title="Share Slip Image"
            subtitle="JPG फोटो शेयर करें"
            disabled={printing}
            onPress={handleShareImage}
          />

          {showAdminSlipActions ? (
            <SlipActionButton
              testID="print-slip"
              icon={<Printer size={22} color={printing ? '#6B7280' : '#41493e'} />}
              title="Print Receipt"
              subtitle="रसीद प्रिंट करें"
              disabled={printing}
              onPress={handlePrint}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Fixed Bottom CTA */}
      {showAdminSlipActions ? (
        <View
        style={{
          position: isWeb ? ('fixed' as any) : 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#CBD5E1',
          padding: 16,
          paddingBottom: footerBottomInset + 16,
          zIndex: 9999,
          elevation: 50,
        }}
      >
        <Pressable
          testID="authorize-next"
          onPress={() => router.replace('/authorization' as any)}
          disabled={printing}
        >
          {({ pressed }) => (
            <View style={{
              height: 56,
              backgroundColor: printing ? '#CBD5E1' : pressed ? '#FBBF24' : '#FDE047',
              borderWidth: 2,
              borderColor: '#00450D',
              borderRadius: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.14,
              shadowRadius: 10,
              elevation: 8,
              opacity: printing ? 0.75 : 1,
            }}>
              <CheckCircle size={22} color="#00450D" />
              <View>
                <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: 16, fontWeight: '900', color: '#003807' }}>
                  Authorize Next
                </Text>
                <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: 11, color: '#365314', fontWeight: '800' }}>
                  {'\u0905\u0917\u0932\u093E \u0905\u0927\u093F\u0915\u0943\u0924 \u0915\u0930\u0947\u0902'}
                </Text>
              </View>
            </View>
          )}
        </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function SlipActionButton({
  testID,
  icon,
  title,
  subtitle,
  primary,
  disabled,
  onPress,
}: {
  testID: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  primary?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
    >
      {({ pressed }) => (
        <View style={{
          minHeight: 58,
          borderRadius: 14,
          backgroundColor: disabled
            ? '#E5E7EB'
            : primary
              ? pressed ? '#FBBF24' : '#FDE047'
              : pressed ? '#E2E8F0' : '#FFFFFF',
          borderWidth: 2,
          borderColor: '#00450D',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          gap: 12,
          elevation: primary ? 4 : 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: primary ? 3 : 0 },
          shadowOpacity: primary ? 0.16 : 0,
          shadowRadius: primary ? 6 : 0,
        }}>
          {icon}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={{ fontSize: 16, fontWeight: '900', color: disabled ? '#6B7280' : primary ? '#003807' : '#052E2B' }}
            >
              {title}
            </Text>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={{ fontSize: 12, color: disabled ? '#6B7280' : primary ? '#365314' : '#64748B', fontWeight: '800', marginTop: 2 }}
            >
              {subtitle}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
