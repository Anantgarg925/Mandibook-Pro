import React from 'react';
import { BottomNavBar } from '@/components/common/BottomNavBar';
import { View, Text, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  BarChart2,
  DollarSign,
  Users,
  Lock,
  Trash2,
  MessageCircle,
  ChevronRight,
} from 'lucide-react-native';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';

type SettingsItem = {
  icon: React.FC<{ size: number; color: string }>;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

function Section({ title, items }: { title: string; items: SettingsItem[] }) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text
        style={{
          fontSize: FontSize.xs,
          fontWeight: '700',
          color: Colors.textSecond,
          paddingHorizontal: Spacing.md,
          paddingVertical: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: Colors.surface,
          borderRadius: Radius.md,
          overflow: 'hidden',
          marginHorizontal: Spacing.md,
        }}
      >
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.label}
              testID={`settings-${item.label.toLowerCase().replace(/[\s/]+/g, '-')}`}
              onPress={item.onPress}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.sm,
                paddingHorizontal: Spacing.md,
                paddingVertical: 14,
                backgroundColor: pressed ? Colors.background : Colors.surface,
                borderBottomWidth: idx < items.length - 1 ? 1 : 0,
                borderBottomColor: Colors.border,
              })}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: item.danger ? '#FFEBEE' : '#FFF3E0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={16} color={item.danger ? Colors.danger : Colors.primary} />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: FontSize.sm,
                  fontWeight: '600',
                  color: item.danger ? Colors.danger : Colors.text,
                }}
              >
                {item.label}
              </Text>
              <ChevronRight size={16} color={Colors.textSecond} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();

  const handleResetToday = () => {
    Alert.alert(
      'क्या आप sure हैं?',
      'आज का सारा डेटा delete हो जाएगा।',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'हाँ, आगे बढ़ें',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'FINAL WARNING',
              "YES DELETE ALL TODAY'S DATA?",
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'DELETE',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: implement actual delete
                    Alert.alert('Done', "Today's data cleared.");
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        {router.canGoBack() ? (
          <Pressable testID="settings-back" onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
        ) : null}
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
          Settings / सेटिंग्स
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: Spacing.md }}>
        <Section
          title="Firm / दुकान"
          items={[
            {
              icon: Building2,
              label: 'Firm Profile',
              onPress: () => router.push('/settings/edit-firm' as any),
            },
            {
              icon: BarChart2,
              label: 'Grades / ग्रेड',
              onPress: () => router.push('/settings/edit-grades' as any),
            },
            {
              icon: DollarSign,
              label: 'Charges / कमीशन',
              onPress: () => router.push('/settings/edit-charges' as any),
            },
          ]}
        />

        <Section
          title="Team / टीम"
          items={[
            {
              icon: Users,
              label: 'Team Members',
              onPress: () => router.push('/settings/team' as any),
            },
            {
              icon: Lock,
              label: 'Change PIN',
              onPress: () => router.push('/settings/change-pin' as any),
            },
          ]}
        />

        <Section
          title="Data / डेटा"
          items={[
            {
              icon: Trash2,
              label: "Reset Today's Data",
              onPress: handleResetToday,
              danger: true,
            },
          ]}
        />

        <Section
          title="About"
          items={[
            {
              icon: MessageCircle,
              label: 'WhatsApp Support',
              onPress: () => {
                Linking.openURL('https://wa.me/919999999999');
              },
            },
          ]}
        />

        <Text
          style={{
            textAlign: 'center',
            color: Colors.textSecond,
            fontSize: FontSize.xs,
            marginTop: Spacing.sm,
          }}
        >
          MandiBook Pro v1.0.0
        </Text>
      </ScrollView>
      <BottomNavBar />
    </SafeAreaView>
  );
}
