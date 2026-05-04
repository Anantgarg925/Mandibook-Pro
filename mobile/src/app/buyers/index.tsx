import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Users } from 'lucide-react-native';
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }} testID="buyers-back">
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
          Buyers / खरीदार
        </Text>
        {buyers.length > 0 && (
          <View style={{
            backgroundColor: Colors.info, borderRadius: Radius.round,
            paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: '#FFF' }}>
              {buyers.length}
            </Text>
          </View>
        )}
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
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
                backgroundColor: pressed ? Colors.background : Colors.surface,
                borderBottomWidth: 1, borderBottomColor: Colors.border,
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
                <Text style={{
                  fontSize: FontSize.sm, fontWeight: '800',
                  color: item.outstandingBalance > 0 ? Colors.danger : Colors.success,
                }}>
                  {item.outstandingBalance > 0 ? toIndianCurrency(item.outstandingBalance) : '✓ Clear'}
                </Text>
                {item.outstandingBalance > 0 && (
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>उधारी</Text>
                )}
              </View>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: Spacing.xl }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 64 }} testID="buyers-empty">
              <Users size={48} color={Colors.border} />
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginTop: Spacing.md }}>
                No buyers yet
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 4 }}>
                Buyers are added automatically when bills are created
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
