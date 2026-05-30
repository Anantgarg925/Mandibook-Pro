import React, { useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Plus } from 'lucide-react-native';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import { Colors, FontSize, Radius, Spacing } from '@/lib/theme';
import { toIndianWeight } from '@/lib/formatters';
import TruckCard from '@/components/truck/TruckCard';
import { DraggableFAB } from '@/components/common/DraggableFAB';

export default function MemberTrucksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trucks, loading } = useTodayTrucks();
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/member-dashboard' as any);
    }
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.headerIcon}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Today's Trucks</Text>
          <Text style={styles.headerSub}>आज की गाड़ियाँ</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          testID="member-truck-list"
          data={trucks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TruckCard truck={item} onPress={() => router.push(`/trucks/${item.id}` as any)} />}
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="local-shipping" size={48} color={Colors.textSecond} />
              <Text style={styles.emptyTitle}>No trucks added today</Text>
              <Text style={styles.emptySub}>Add the first truck to start billing.</Text>
            </View>
          }
        />
      )}

      <DraggableFAB
        testID="new-truck-fab"
        onPress={() => router.push('/trucks/register')}
        initialBottom={8}
        initialRight={16}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: Colors.primary,
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: 30,
          gap: Spacing.sm,
        }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={14} color="#FFFFFF" strokeWidth={3} />
          </View>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '800' }}>Register New</Text>
            <Text style={{ color: '#DFF4FF', fontSize: 10, fontWeight: '600' }}>नई गाड़ी जोड़ें</Text>
          </View>
        </View>
      </DraggableFAB>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3FAFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 1 },
  headerAdd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  addCard: {
    margin: Spacing.md,
    marginBottom: 0,
    minHeight: 92,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: Spacing.md,
  },
  addIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTitle: { fontSize: FontSize.md, fontWeight: '800', color: '#fff' },
  addSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.78)', marginTop: 2 },
  truckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  truckIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
  },
  truckNumber: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  truckMeta: { fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 2 },
  truckSub: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginTop: 12 },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 4 },
});
