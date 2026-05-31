import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Settings } from 'lucide-react-native';
import { useInquiries } from '@/hooks/useInquiries';
import PendingInquiryCard from '@/components/bills/PendingInquiryCard';
import { Colors, FontSize, Spacing } from '@/lib/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PagerView from '@/components/common/PagerView';

// TODO: add admin PIN gate once role selection (Phase N) is built

export default function AuthorizationScreen() {
  const { pending, loading } = useInquiries();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [currentPage, setCurrentPage] = React.useState(0);
  const visiblePending = id ? pending.filter((bill) => bill.id === id) : pending;

  const activePage = Math.min(currentPage, Math.max(0, visiblePending.length - 1));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F8FA' }} edges={['top', 'bottom']}>
      {/* Top Bar matching config */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          backgroundColor: Colors.primary,
          borderBottomWidth: 0,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 8, marginRight: Spacing.sm }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>
          Authorization
        </Text>
        <Pressable onPress={() => router.push('/settings' as any)}>
          <Settings size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Page Title */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F2C23', letterSpacing: -0.5, marginBottom: 4 }}>
          Pending Bills / पेंडिंग बिल ({pending.length})
        </Text>
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
          {id ? 'Verify and authorize this slip' : 'Verify and authorize market transactions'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          testID="auth-loading"
          color={Colors.primary}
          size="large"
          style={{ marginTop: 48 }}
        />
      ) : visiblePending.length === 0 ? (
        <View
          testID="auth-empty"
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 64 }}
        >
          <Text style={{ fontSize: 48, marginBottom: Spacing.sm }}>✅</Text>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: Colors.text }}>
            सब क्लियर है!
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 4 }}>
            {id ? 'This slip is no longer pending' : 'No pending bills'}
          </Text>
        </View>
      ) : (
        <PagerView
          style={{ flex: 1 }}
          initialPage={0}
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
        >
          {visiblePending.map((item, idx) => {
            const isVisible = Math.abs(idx - activePage) <= 1;
            return (
              <View key={item.id} style={{ flex: 1 }}>
                {isVisible ? (
                  <ScrollView
                    contentContainerStyle={{ paddingBottom: Spacing.xl }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <PendingInquiryCard inquiry={item} />
                  </ScrollView>
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={Colors.primary} size="large" />
                  </View>
                )}
              </View>
            );
          })}
        </PagerView>
      )}
    </SafeAreaView>
  );
}
