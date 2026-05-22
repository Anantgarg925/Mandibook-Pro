import React, { useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, BackHandler } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle, CheckCircle, Truck, FileText } from 'lucide-react-native';
import { useInquiries } from '@/hooks/useInquiries';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency } from '@/lib/formatters';
import { useBillNotifications } from '@/context/BillNotificationContext';
import { useMemberMode } from '@/hooks/useMemberMode';

type Notification = {
  id: string;
  type: 'pending' | 'confirmed' | 'low_stock' | 'truck';
  title: string;
  subtitle: string;
  time: number;
};

const ICON_MAP = {
  pending: { icon: AlertTriangle, color: '#E65100', bg: '#FFF3E0' },
  confirmed: { icon: CheckCircle, color: '#2E7D32', bg: '#E8F5E9' },
  low_stock: { icon: Truck, color: '#C62828', bg: '#FFEBEE' },
  truck: { icon: Truck, color: '#0277BD', bg: '#E1F5FE' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { inquiries, pending } = useInquiries();
  const { trucks } = useTodayTrucks();
  const { clearUnread } = useBillNotifications();
  const isMemberMode = useMemberMode();
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (isMemberMode) {
      router.replace('/member-dashboard' as any);
      return;
    }
    router.replace('/(tabs)' as any);
  };

  useEffect(() => {
    clearUnread().catch(() => {});
  }, [clearUnread]);

  useEffect(() => {
    if (isMemberMode === undefined) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace((isMemberMode ? '/member-dashboard' : '/(tabs)') as any);
      return true;
    });
    return () => subscription.remove();
  }, [isMemberMode, router]);

  const notifications = useMemo(() => {
    const items: Notification[] = [];

    for (const inq of pending) {
      items.push({
        id: `pending-${inq.id}`,
        type: 'pending',
        title: `Bill #${inq.slipNumber} pending authorization`,
        subtitle: `${inq.customerName} — ${inq.grade} — ${inq.sacks} bags`,
        time: inq.createdAt,
      });
    }

    for (const inq of inquiries.filter(i => i.status === 'CONFIRMED')) {
      items.push({
        id: `confirmed-${inq.id}`,
        type: 'confirmed',
        title: `Bill #${inq.slipNumber} confirmed`,
        subtitle: `${inq.customerName} — ${toIndianCurrency(inq.netAmount)}`,
        time: inq.createdAt,
      });
    }

    for (const truck of trucks) {
      const totalKg = truck.totalKg;
      const confirmedKg = truck.gradeInventory.reduce((s: number, g: any) => s + g.confirmedKg, 0);
      const provisionalKg = truck.gradeInventory.reduce((s: number, g: any) => s + g.provisionalKg, 0);
      const availableKg = Math.max(0, totalKg - confirmedKg - provisionalKg);
      const pct = totalKg > 0 ? (availableKg / totalKg) * 100 : 100;

      if (pct < 20 && totalKg > 0) {
        items.push({
          id: `low-${truck.id}`,
          type: 'low_stock',
          title: `Low stock: ${truck.truckNumber}`,
          subtitle: `Only ${Math.round(availableKg)} kg remaining (${Math.round(pct)}%)`,
          time: truck.createdAt,
        });
      }
    }

    items.sort((a, b) => b.time - a.time);
    return items;
  }, [inquiries, pending, trucks]);

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['bottom']}>
      <View style={{
        paddingTop: insets.top + Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        backgroundColor: Colors.primary,
        borderBottomWidth: 0,
      }}>
        <Pressable testID="notif-back" onPress={goBack} style={{ padding: 4 }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>
          Notifications
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: 'rgba(255, 255, 255, 0.8)' }}>
          {pending.length > 0 ? `${pending.length} pending` : null}
        </Text>
      </View>

      <FlatList
        testID="notifications-list"
        data={notifications}
        keyExtractor={n => n.id}
        renderItem={({ item }) => {
          const cfg = ICON_MAP[item.type];
          const Icon = cfg.icon;
          return (
            <Pressable
              testID={`notif-${item.id}`}
              onPress={() => {
                if (item.type === 'pending' || item.type === 'confirmed') {
                  const inquiryId = item.id.replace(/^(pending|confirmed)-/, '');
                  if (item.type === 'confirmed') {
                    router.push(`/slip/${inquiryId}` as any);
                  } else {
                    router.push({ pathname: '/authorization', params: { id: inquiryId } } as any);
                  }
                } else if (item.type === 'low_stock') {
                  const truckId = item.id.replace(/^low-/, '');
                  router.push(`/trucks/${truckId}` as any);
                }
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: Spacing.md,
                paddingVertical: 14,
                backgroundColor: pressed ? Colors.background : Colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              })}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: cfg.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={18} color={cfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: Colors.textSecond }}>
                {timeAgo(item.time)}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View testID="notifications-empty" style={{ alignItems: 'center', paddingVertical: 64 }}>
            <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>🔔</Text>
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
              No notifications right now
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 4 }}>
              कोई सूचना नहीं
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
