import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Bell, LogOut } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { useInquiries } from '@/hooks/useInquiries';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import { useResponsive } from '@/hooks/useResponsive';
import { toIndianCurrency } from '@/lib/formatters';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { Inquiry } from '@/types/inquiry';
import { APP_SESSION_KEY, MEMBER_SESSION_KEY } from '@/lib/session';
import { useBillNotifications } from '@/context/BillNotificationContext';
import { getCurrentBusinessDate } from '@/lib/businessDay';
import { resetToRoute } from '@/utils/navigation';

type MemberSession = {
  id: string;
  name: string;
  phone: string;
  role: string;
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.success,
  CANCELLED: Colors.danger,
};
const STATUS_BG: Record<string, string> = {
  PENDING: '#FFF8E1',
  CONFIRMED: '#E8F5E9',
  CANCELLED: '#FFEBEE',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'PENDING',
  CONFIRMED: 'PAID',
  CANCELLED: 'CANCELLED',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const now = getCurrentBusinessDate();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
}

export default function MemberDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentHPad, isSmall } = useResponsive();
  const { shop } = useShop();
  const { inquiries } = useInquiries();
  const { trucks } = useTodayTrucks();
  const { unreadCount } = useBillNotifications();
  const [member, setMember] = useState<MemberSession | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(MEMBER_SESSION_KEY)
      .then((raw) => {
        if (raw) setMember(JSON.parse(raw) as MemberSession);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  const logout = async () => {
    await AsyncStorage.removeItem(APP_SESSION_KEY);
    await AsyncStorage.removeItem(MEMBER_SESSION_KEY);
    resetToRoute(router, '/member-login' as any);
  };

  const recentBills = inquiries.slice(0, 5);
  const liveTrucks = trucks.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        testID="member-dashboard"
        data={recentBills}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: Math.max(0, contentHPad - Spacing.md) }}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: Math.max(Spacing.md, contentHPad) }]}>
              <View style={styles.headerLeft}>
                <Pressable testID="member-menu-btn" style={styles.menuBtn}>
                  <MaterialIcons name="menu" size={24} color={Colors.text} />
                </Pressable>
                <View>
                  <Text style={styles.brandName}>MandiBook Pro</Text>
                  <View style={styles.memberBadge}>
                    <Text style={styles.memberBadgeText}>{member?.role || 'MEMBER'}</Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  testID="member-notifications-btn"
                  onPress={() => router.push('/notifications' as any)}
                  style={styles.avatar}
                >
                  <Bell size={22} color={Colors.primary} />
                  {unreadCount > 0 ? (
                    <View style={styles.badgeDot}>
                      <Text style={styles.badgeDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  ) : null}
                </Pressable>
                <Pressable testID="member-avatar-btn" onPress={() => router.push('/member-profile')} style={styles.avatar}>
                  <MaterialIcons name="person" size={24} color={Colors.primary} />
                </Pressable>
                <Pressable testID="member-dashboard-logout-btn" onPress={logout} style={[styles.avatar, styles.logoutAvatar]}>
                  <LogOut size={21} color="#B91C1C" />
                </Pressable>
              </View>
            </View>

            {/* Quick Action Cards */}
            <View style={[styles.actionRow, { paddingHorizontal: Math.max(Spacing.md, contentHPad) }]}>
              <Pressable
                testID="member-new-bill-btn"
                onPress={() => router.push('/bills/new')}
                style={{ flex: 1.2 }}
              >
                {({ pressed }) => (
                  <View style={[styles.actionCardPrimary, pressed && { opacity: 0.9 }]}>
                    <View style={styles.actionIconWrapWhite}>
                      <MaterialIcons name="add-circle-outline" size={24} color="#fff" />
                    </View>
                    <Text style={styles.actionPrimaryTitle}>Create New Bill</Text>
                    <Text style={styles.actionPrimarySub}>नया बिल बनाएं</Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                testID="member-trucks-btn"
                onPress={() => router.push('/member-trucks')}
                style={{ flex: 1 }}
              >
                {({ pressed }) => (
                  <View style={[styles.actionCardSecondary, pressed && { opacity: 0.9 }]}>
                    <View style={styles.actionIconWrapLight}>
                      <MaterialIcons name="local-shipping" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.actionSecondaryTitle}>Today's Trucks</Text>
                    <Text style={styles.actionSecondarySub}>आज की गाड़ियाँ</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Live Feed */}
            {liveTrucks.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.liveFeedTitle}>
                    <Text style={styles.sectionTitle}>Live Feed</Text>
                    <View style={styles.liveDot} />
                  </View>
                  <Text style={styles.sectionHindi}>ताज़ा आमद</Text>
                </View>

                <View style={styles.feedCard}>
                  {liveTrucks.map((truck, idx) => {
                    const mainGrade = truck.gradeInventory[0];
                    const gradeName = shop?.commodity || mainGrade?.name || 'Mosambi';
                    const arrivedTime = formatTime(truck.createdAt);

                    return (
                      <Pressable
                        key={truck.id}
                        testID={`feed-truck-${truck.id}`}
                        onPress={() => router.push(`/trucks/${truck.id}` as any)}
                        style={{ marginBottom: idx < liveTrucks.length - 1 ? 0 : 0 }}
                      >
                        {({ pressed }) => (
                          <View style={[
                            styles.feedRow,
                            idx < liveTrucks.length - 1 && styles.feedRowBorder,
                            pressed && { backgroundColor: '#F9FAFB' }
                          ]}>
                            <View style={styles.feedIconWrap}>
                              <MaterialIcons
                                name={idx % 2 === 0 ? 'agriculture' : 'inventory-2'}
                                size={22}
                                color={Colors.primary}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.feedTitle}>{gradeName}</Text>
                              <Text style={styles.feedSub}>
                                Truck {truck.truckNumber} Arrived
                              </Text>
                            </View>
                            <Text style={styles.feedTime}>{arrivedTime}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* My Recent Bills header */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>My Recent Bills</Text>
                  <Text style={styles.sectionHindi}>मेरे हालिया बिल</Text>
                </View>
                <Pressable
                  testID="member-see-all-bills"
                  onPress={() => router.push('/bills/new')}
                  style={styles.seeAllBtn}
                >
                  <Text style={styles.seeAllText}>New Bill</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={Colors.primary} />
                </Pressable>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }: { item: Inquiry }) => {
          const statusLabel = STATUS_LABEL[item.status] ?? item.status;
          const statusColor = STATUS_COLOR[item.status] ?? Colors.textSecond;
          const statusBg = STATUS_BG[item.status] ?? '#F5F5F5';
          const timeLabel = isToday(item.date)
            ? formatTime(item.date)
            : 'Yesterday';

          return (
            <Pressable
              testID={`member-bill-${item.id}`}
              onPress={() => {
                if (item.status === 'PENDING') {
                  router.push(`/bills/${item.id}` as any);
                } else {
                  router.push(`/slip/${item.id}` as any);
                }
              }}
              style={{ marginHorizontal: Math.max(Spacing.md, contentHPad), marginBottom: 10 }}
            >
              {({ pressed }) => (
                <View style={[styles.billCard, pressed && { opacity: 0.95 }]}>
                  <View style={styles.billIconWrap}>
                    <MaterialIcons name="receipt-long" size={24} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.billName} numberOfLines={1}>
                      {item.customerName}
                    </Text>
                    <Text style={styles.billMeta}>
                      Slip #{item.slipNumber} {'\u2022'} {timeLabel}
                    </Text>
                  </View>
                  <View style={styles.billRight}>
                    <Text style={styles.billAmount}>
                      {toIndianCurrency(item.netAmount)}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap} testID="member-bills-empty">
            <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>📋</Text>
            <Text style={styles.emptyText}>No bills yet</Text>
            <Text style={styles.emptySub}>आज कोई बिल नहीं</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  memberBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  memberBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  logoutAvatar: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#D92D20',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  badgeDotText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.md,
  },
  actionCardPrimary: {
    flex: 1.2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 140,
    justifyContent: 'space-between',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionCardSecondary: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 140,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconWrapWhite: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapLight: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
  },
  actionPrimarySub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  actionSecondaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  actionSecondarySub: {
    fontSize: 11,
    color: Colors.textSecond,
    marginTop: 2,
  },

  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  liveFeedTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionHindi: {
    fontSize: FontSize.xs,
    color: Colors.textSecond,
    marginTop: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },

  feedCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  feedRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  feedIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  feedSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecond,
    marginTop: 2,
  },
  feedTime: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecond,
  },

  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },

  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  billIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  billMeta: {
    fontSize: FontSize.xs,
    color: Colors.textSecond,
    marginTop: 2,
  },
  billRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  billAmount: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.round,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecond,
  },
  emptySub: {
    fontSize: FontSize.xs,
    color: Colors.textSecond,
    marginTop: 2,
  },

});
