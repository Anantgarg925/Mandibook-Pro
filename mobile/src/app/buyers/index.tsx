import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import { useBuyers } from '@/hooks/useBuyers';
import { toIndianCurrency } from '@/lib/formatters';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { Buyer } from '@/types/inquiry';

export default function BuyerListScreen() {
  const router = useRouter();
  const { buyers, loading } = useBuyers();
  const [search, setSearch] = useState('');

  const sorted = useMemo(() =>
    [...buyers]
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
      .filter(b =>
        !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.phone.includes(search) ||
        b.code.toLowerCase().includes(search.toLowerCase())
      ),
    [buyers, search]
  );

  const totalOutstanding = buyers.reduce((s, b) => s + b.outstandingBalance, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{
        backgroundColor: Colors.headerBg,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
            testID="buyers-back"
          >
            <ArrowLeft size={20} color="#FFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFF' }}>
              Buyers / खरीदार
            </Text>
            {totalOutstanding > 0 ? (
              <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' }}>
                उधारी: {toIndianCurrency(totalOutstanding)}
              </Text>
            ) : null}
          </View>
          {buyers.length > 0 ? (
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.round,
              paddingHorizontal: 10, paddingVertical: 4,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
            }}>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: '#FFF' }}>
                {buyers.length}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Search */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
      }}>
        <Search size={16} color={Colors.textSecond} />
        <TextInput
          testID="buyers-search"
          placeholder="Search by name, phone, code..."
          placeholderTextColor={Colors.textSecond}
          value={search}
          onChangeText={setSearch}
          style={{
            flex: 1, fontSize: FontSize.sm, color: Colors.text,
            paddingVertical: 8,
          }}
        />
      </View>

      {loading ? (
        <ActivityIndicator testID="buyers-loading" color={Colors.primary} size="large" style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          testID="buyers-list"
          data={sorted}
          keyExtractor={b => b.code}
          renderItem={({ item }: { item: Buyer }) => (
            <Pressable
              testID={`buyer-row-${item.code}`}
              onPress={() => router.push(`/buyers/${item.code}` as any)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? Colors.background : Colors.surface,
                marginHorizontal: Spacing.md,
                marginBottom: Spacing.sm,
                borderRadius: Radius.md,
                padding: Spacing.md,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 1,
                borderWidth: 1,
                borderColor: Colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.sm,
              })}
            >
              <View style={{
                width: 44, height: 44, borderRadius: Radius.sm,
                backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '900', color: '#FFF' }}>
                  {item.code}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>
                  {item.name}
                </Text>
                {item.phone ? (
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>{item.phone}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 3,
                  borderRadius: Radius.round,
                  backgroundColor: item.outstandingBalance > 0 ? '#FFEBEE' : '#E8F5E9',
                }}>
                  <Text style={{
                    fontSize: 10, fontWeight: '800',
                    color: item.outstandingBalance > 0 ? Colors.danger : Colors.success,
                  }}>
                    {item.outstandingBalance > 0 ? 'UDHAARI' : 'CONFIRMED'}
                  </Text>
                </View>
                <Text style={{
                  fontSize: FontSize.sm, fontWeight: '800', marginTop: 4,
                  color: item.outstandingBalance > 0 ? Colors.danger : Colors.success,
                }}>
                  {item.outstandingBalance > 0 ? toIndianCurrency(item.outstandingBalance) : 'Clear'}
                </Text>
              </View>
            </Pressable>
          )}
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: Spacing.xl }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 64 }} testID="buyers-empty">
              <Text style={{ fontSize: 48, marginBottom: Spacing.sm }}>👥</Text>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
                कोई ग्राहक नहीं
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 4, textAlign: 'center', paddingHorizontal: Spacing.lg }}>
                Customers appear after first UDHAARI sale
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
