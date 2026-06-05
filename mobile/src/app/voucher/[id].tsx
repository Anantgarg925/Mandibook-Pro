import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'react-native-expo-router'; // Wait, let's just use expo-router
import { useRouter as useExpoRouter, useLocalSearchParams as useExpoParams } from 'expo-router';
import { Share2, ArrowLeft, Image as ImageIcon } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { supabase } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import { Colors } from '@/lib/theme';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import { downloadTestIdAsJpeg } from '@/utils/webExport';
import { UgraiCollection } from '@/hooks/useUgrai';

// Helper to convert number to words
function numberToWords(num: number): string {
  const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
  const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; 
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim().toUpperCase() + ' ONLY';
}

export default function VoucherScreen() {
  const router = useExpoRouter();
  const { id } = useExpoParams<{ id: string }>();
  const { shop } = useShop();
  const [printing, setPrinting] = useState(false);
  const slipCardRef = useRef<View>(null);
  const insets = useSafeAreaInsets();

  const { data: collection } = useQuery({
    queryKey: ['ugrai_collections', shop?.shopId, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ugrai_collections')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as UgraiCollection;
    },
    enabled: !!shop?.shopId && !!id,
  });

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  };

  const handleShareImage = async () => {
    if (!slipCardRef.current) return;
    setPrinting(true);
    try {
      if (Platform.OS === 'web') {
        await downloadTestIdAsJpeg('voucher-card-web', `voucher-${Date.now()}.jpg`);
        return;
      }
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
        dialogTitle: `Share Payment Voucher`,
      });
    } catch {
      Alert.alert('Share Error', 'Could not create voucher image.');
    } finally {
      setPrinting(false);
    }
  };

  if (!collection || !shop) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const voucherNumber = `RV${new Date(collection.created_at).toISOString().slice(2,10).replace(/-/g, '')}${collection.id.substring(0,4).toUpperCase()}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#E8E8E8' }} edges={['top', 'bottom']}>
      {/* Header bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.primary }}>
        <Pressable onPress={goBack} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>Payment Voucher</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View
          ref={slipCardRef}
          testID="voucher-card-web"
          collapsable={false}
          style={{
            backgroundColor: '#FFFFFF',
            padding: 24,
            borderRadius: 8,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
            marginBottom: 20,
          }}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 4 }}>CASH Receipt Voucher</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#000' }}>{shop.firmName}</Text>
            <Text style={{ fontSize: 12, color: '#333' }}>{shop.address}, {shop.city}</Text>
          </View>

          {/* Meta */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontSize: 13, color: '#000' }}>Voucher No. : {voucherNumber}</Text>
            <Text style={{ fontSize: 13, color: '#000' }}>DATED : {toIndianDate(collection.created_at)}</Text>
          </View>

          {/* Body */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: '#000' }}>Credit to.. <Text style={{ fontWeight: '700' }}>{collection.buyer_name}</Text> a/c</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>Rs. {collection.amount.toFixed(2)}</Text>
          </View>

          <Text style={{ fontSize: 14, color: '#000', marginBottom: 12 }}>On Account of UGRAI</Text>

          <Text style={{ fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 30 }}>
            {numberToWords(collection.amount)}
          </Text>

          <Text style={{ fontSize: 14, color: '#000', lineHeight: 22, marginBottom: 40 }}>
            I/We receipt the sum of Rupees... Rs. <Text style={{ fontWeight: '700' }}>{collection.amount.toFixed(2)}</Text>{'\n'}
            {numberToWords(collection.amount)} in CASH
          </Text>

          {/* Signatures */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <Text style={{ fontSize: 14, color: '#000' }}>Accounts Manager</Text>
            <Text style={{ fontSize: 14, color: '#000' }}>Signature</Text>
          </View>
          
          {/* Bottom Line */}
          <View style={{ height: 1, backgroundColor: '#000', marginTop: 40, opacity: 0.2 }} />
        </View>

        <View style={{ gap: 10 }}>
          <Pressable
            testID="share-voucher-image"
            onPress={handleShareImage}
            disabled={printing}
            style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#16A34A', padding: 16, borderRadius: 12, gap: 16
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={22} color={printing ? '#6B7280' : '#16A34A'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#16A34A' }}>Share Voucher Image</Text>
              <Text style={{ fontSize: 13, color: '#15803D' }}>JPG फोटो शेयर करें</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
