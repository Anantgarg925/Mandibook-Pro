import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, BackHandler, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Bell,
  Building2,
  HelpCircle,
  Languages,
  LockKeyhole,
  LogOut,
  Phone,
  User,
} from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Radius, Spacing } from '@/lib/theme';
import { APP_SESSION_KEY, MEMBER_SESSION_KEY } from '@/lib/session';
import { resetToRoute } from '@/utils/navigation';

type MemberSession = {
  id: string;
  name: string;
  phone: string;
  role: string;
};

export default function MemberProfileScreen() {
  const router = useRouter();
  const { shop } = useShop();
  const [member, setMember] = useState<MemberSession | null>(null);
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/member-dashboard' as any);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(MEMBER_SESSION_KEY)
      .then((raw) => {
        if (raw) setMember(JSON.parse(raw) as MemberSession);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [router]);

  const logout = async () => {
    await AsyncStorage.removeItem(APP_SESSION_KEY);
    await AsyncStorage.removeItem(MEMBER_SESSION_KEY);
    resetToRoute(router, '/member-login');
  };

  const displayName = member?.name || 'Member';
  const role = member?.role || 'Billing Clerk';
  const phone = member?.phone || shop?.phone1 || '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.headerIcon}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>My Profile / मेरी प्रोफाइल</Text>
        <Bell size={22} color={Colors.text} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHero}>
          <View style={styles.avatar}>
            <User size={58} color={Colors.primary} />
            <View style={styles.editBadge}>
              <MaterialIcons name="edit" size={16} color="#fff" />
            </View>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>{role} / बिलिंग क्लर्क</Text>
          <View style={styles.idBadge}>
            <Text style={styles.idText}>ID: {member?.id?.slice(-8).toUpperCase() || 'MEMBER'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.softIcon}><Phone size={22} color={Colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>+91 {phone || 'Not set'}</Text>
            <Text style={styles.cardSub}>Mobile Number / मोबाइल नंबर</Text>
          </View>
          <LockKeyhole size={22} color={Colors.textSecond} />
        </View>

        <View style={styles.card}>
          <View style={styles.softIcon}><Building2 size={22} color={Colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{shop?.firmName || 'Firm'}</Text>
            <Text style={styles.cardSub}>Firm Name / फर्म का नाम</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>SETTINGS & SECURITY / सेटिंग्स और सुरक्षा</Text>

        <ProfileRow
          icon={<LockKeyhole size={22} color={Colors.text} />}
          title="Change Security PIN"
          subtitle="पिन बदलें"
          onPress={() => Alert.alert('PIN Change', 'Ask admin to update your member PIN from Team settings.')}
        />
        <ProfileRow
          icon={<Languages size={22} color={Colors.text} />}
          title="App Language"
          subtitle="ऐप की भाषा"
          value="English"
        />
        <ProfileRow
          icon={<HelpCircle size={22} color={Colors.text} />}
          title="Help & Support"
          subtitle="सहायता और सपोर्ट"
          onPress={() => Alert.alert('Support', 'Contact your firm admin for support.')}
        />

        <Pressable testID="member-logout-btn" onPress={logout} style={styles.logout}>
          <LogOut size={22} color="#B91C1C" />
          <View style={{ flex: 1 }}>
            <Text style={styles.logoutTitle}>Logout</Text>
            <Text style={styles.logoutSub}>लॉगआउट</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={24} color="#EF4444" />
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.version}>MandiBook Pro v2.4.0</Text>
          <Text style={styles.powered}>Powered by Institutional Trust</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <MaterialIcons name="chevron-right" size={26} color={Colors.textSecond} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3FAFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  profileHero: { alignItems: 'center', paddingVertical: 34 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDF3FF',
    borderWidth: 5,
    borderColor: '#E3F2FD',
  },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: { fontSize: 24, fontWeight: '900', color: Colors.text, marginTop: 16 },
  role: { fontSize: FontSize.md, color: Colors.textSecond, marginTop: 4 },
  idBadge: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: '#B7C8B0',
    backgroundColor: '#E7F6F8',
  },
  idText: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary },
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: 14,
    minHeight: 92,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: Spacing.md,
  },
  softIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF5EF',
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  cardSub: { fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 },
  sectionLabel: {
    marginHorizontal: Spacing.md,
    marginTop: 8,
    marginBottom: 12,
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1.2,
  },
  row: {
    minHeight: 78,
    marginHorizontal: Spacing.md,
    marginBottom: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: Spacing.md,
  },
  rowIcon: { width: 34, alignItems: 'center' },
  rowTitle: { fontSize: FontSize.md, color: Colors.text },
  rowSub: { fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 },
  rowValue: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary },
  logout: {
    minHeight: 78,
    marginHorizontal: Spacing.md,
    marginTop: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: Spacing.md,
  },
  logoutTitle: { fontSize: FontSize.md, fontWeight: '800', color: '#B91C1C' },
  logoutSub: { fontSize: FontSize.xs, color: '#B91C1C', marginTop: 2 },
  footer: { alignItems: 'center', marginTop: 34 },
  version: { fontSize: FontSize.sm, fontWeight: '800', color: '#94A3B8' },
  powered: { fontSize: FontSize.xs, color: '#94A3B8', marginTop: 4 },
});
