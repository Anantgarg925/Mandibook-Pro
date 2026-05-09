import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { useBuyers } from '@/hooks/useBuyers';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import type { Buyer } from '@/types/inquiry';

export default function BuyerListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { buyers, loading } = useBuyers();
  const [search, setSearch] = useState('');

  const sorted = useMemo(
    () =>
      [...buyers]
        .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
        .filter(
          (b) =>
            !search ||
            b.name.toLowerCase().includes(search.toLowerCase()) ||
            b.phone.includes(search) ||
            b.code.toLowerCase().includes(search.toLowerCase())
        ),
    [buyers, search]
  );

  const totalOutstanding = buyers.reduce((s, b) => s + b.outstandingBalance, 0);

  const ListHeader = (
    <>
      {/* Top nav bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          testID="buyers-back"
          hitSlop={8}
        >
          <ArrowLeft size={22} color="#1a3c20" />
        </Pressable>
        <Text
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: '#1a3c20',
          }}
        >
          Buyers / ग्राहक
        </Text>
      </View>

      {/* Page content starts here */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        {/* Title stats row */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 16,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: '#071e27',
                letterSpacing: -0.5,
              }}
            >
              Buyers / ग्राहक
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              {buyers.length} active buyer accounts
            </Text>
          </View>
          {totalOutstanding > 0 ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{
                  fontSize: 10,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  textAlign: 'right',
                }}
              >
                Total Receivable
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: '#ba1a1a',
                  textAlign: 'right',
                }}
              >
                {toIndianCurrency(totalOutstanding)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Search + Filter row */}
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
            <TextInput
              testID="buyers-search"
              placeholder="Search by name or code..."
              placeholderTextColor="#c0c9bb"
              value={search}
              onChangeText={setSearch}
              style={{
                height: 56,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#c0c9bb',
                borderRadius: 14,
                paddingLeft: 48,
                paddingRight: 16,
                fontSize: 15,
                color: '#071e27',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 16,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
              }}
              pointerEvents="none"
            >
              <Search size={18} color="#717a6d" />
            </View>
          </View>
          <Pressable
            testID="buyers-filter-btn"
            style={{
              width: 56,
              height: 56,
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: '#c0c9bb',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersHorizontal size={20} color="#41493e" />
          </Pressable>
        </View>
      </View>
    </>
  );

  const renderBuyerCard = ({ item }: { item: Buyer }) => {
    const daysOld =
      (Date.now() - item.lastTransactionDate) / (1000 * 60 * 60 * 24);

    let statusLabel = 'Cleared / भुगतान';
    let statusBg = '#acf4a4';
    let statusText = '#0c5216';
    if (item.outstandingBalance > 0 && daysOld > 7) {
      statusLabel = 'Overdue / बकाया';
      statusBg = '#ffdad6';
      statusText = '#93000a';
    } else if (item.outstandingBalance > 0) {
      statusLabel = 'Pending / लंबित';
      statusBg = '#ffdad6';
      statusText = '#93000a';
    }

    const isPending = item.outstandingBalance > 0;

    return (
      <Pressable
        testID={`buyer-row-${item.code}`}
        onPress={() => router.push(`/buyers/${item.code}` as any)}
        style={({ pressed }) => ({
          backgroundColor: pressed ? '#f0f8ff' : '#ffffff',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
          marginHorizontal: 20,
          elevation: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          overflow: 'hidden',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        })}
      >
        {/* Decorative corner circle for pending/overdue */}
        {isPending ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 80,
              height: 80,
              backgroundColor: 'rgba(255,218,214,0.15)',
              borderBottomLeftRadius: 80,
            }}
            pointerEvents="none"
          />
        ) : null}

        {/* Left side */}
        <View style={{ flex: 1, gap: 10 }}>
          {/* Pills row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View
              style={{
                backgroundColor: '#dbf1fe',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                marginRight: 8,
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#003d65',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {item.code}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: statusBg,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                marginRight: 8,
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: statusText,
                  letterSpacing: 1,
                }}
              >
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* Name */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#071e27',
              marginTop: 2,
            }}
          >
            {item.name}
          </Text>

          {/* Phone or No contact */}
          <Text style={{ fontSize: 13, color: '#41493e' }}>
            {item.phone ? item.phone : 'No contact'}
          </Text>
        </View>

        {/* Right side */}
        <View style={{ alignItems: 'flex-end', gap: 4, paddingLeft: 12 }}>
          {/* Balance label */}
          {item.outstandingBalance > 0 ? (
            <Text
              style={{
                fontSize: 10,
                color: '#64748B',
                opacity: 0.7,
              }}
            >
              Balance Due
            </Text>
          ) : (
            <Text style={{ fontSize: 10, color: '#64748B', opacity: 0.7 }}>
              Balance
            </Text>
          )}

          {/* Amount */}
          {item.outstandingBalance > 0 ? (
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: '#ba1a1a',
              }}
            >
              {toIndianCurrency(item.outstandingBalance)}
            </Text>
          ) : (
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: '#717a6d',
              }}
            >
              ₹ 0.00
            </Text>
          )}

          {/* Last transaction */}
          {item.lastTransactionDate > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                gap: 4,
                alignItems: 'center',
              }}
            >
              <Clock size={13} color="#717a6d" />
              <Text style={{ fontSize: 11, color: '#717a6d' }}>
                Last: {toIndianDate(item.lastTransactionDate)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#f3faff' }}
      edges={['top']}
    >
      <View style={{ flex: 1 }}>
        {loading ? (
          <>
            {ListHeader}
            <View
              testID="buyers-loading"
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <ActivityIndicator color="#00450d" size="large" />
            </View>
          </>
        ) : (
          <FlatList
            testID="buyers-list"
            data={sorted}
            keyExtractor={(b) => b.code}
            renderItem={renderBuyerCard}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View
                testID="buyers-empty"
                style={{
                  alignItems: 'center',
                  paddingVertical: 64,
                  paddingHorizontal: 32,
                }}
              >
                <Users size={56} color="#c0c9bb" />
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: '#071e27',
                    marginTop: 16,
                  }}
                >
                  कोई ग्राहक नहीं
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: '#64748B',
                    textAlign: 'center',
                    marginTop: 8,
                  }}
                >
                  Customers appear after first UDHAARI sale
                </Text>
              </View>
            }
          />
        )}

        {/* FAB */}
        <View
          testID="add-buyer-fab"
          style={{
            position: 'absolute',
            bottom: 24 + insets.bottom,
            right: 20,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#1b5e20',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
          }}
        >
          <UserPlus size={26} color="#ffffff" />
        </View>
      </View>
    </SafeAreaView>
  );
}
