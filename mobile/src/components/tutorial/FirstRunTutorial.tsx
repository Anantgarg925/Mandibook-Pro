import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookOpen, FileText, Truck, Users, WalletCards } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { useLaunch } from '@/context/LaunchContext';
import { Colors, FontSize, Radius, Spacing } from '@/lib/theme';

const VERSION = 1;

const steps = [
  {
    title: 'Register trucks',
    body: 'Start by adding truck arrival details and grade inventory. This becomes the stock source for bills.',
    icon: Truck,
  },
  {
    title: 'Create bills',
    body: 'Use New Bill to select truck, grade, sacks, weight, rate, and payment type.',
    icon: FileText,
  },
  {
    title: 'Authorize slips',
    body: 'Pending bills stay in authorization until checked. Confirmed credit bills update buyer ledgers.',
    icon: BookOpen,
  },
  {
    title: 'Manage buyers',
    body: 'Track outstanding balances, record payments, and share reminders from buyer ledgers.',
    icon: Users,
  },
  {
    title: 'Subscription',
    body: 'Your first 20 days are free. After that, scan the Paytm QR and submit the payment note for activation.',
    icon: WalletCards,
  },
] as const;

export function FirstRunTutorial() {
  const { shop } = useShop();
  const { launchComplete } = useLaunch();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const storageKey = useMemo(
    () => (shop?.shopId ? `mandibook_tutorial_seen_${shop.shopId}_v${VERSION}` : ''),
    [shop?.shopId],
  );

  useEffect(() => {
    if (!shop?.shopId || !launchComplete || !storageKey) return;
    let mounted = true;
    AsyncStorage.getItem(storageKey)
      .then((seen) => {
        if (mounted && !seen) setVisible(true);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [launchComplete, shop?.shopId, storageKey]);

  const close = async () => {
    if (storageKey) {
      await AsyncStorage.setItem(storageKey, '1');
    }
    setVisible(false);
  };

  const step = steps[index];
  const Icon = step.icon;
  const last = index === steps.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          padding: Spacing.md,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: Colors.surface,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: Spacing.lg,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#E8F5E9',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: Spacing.md,
            }}
          >
            <Icon size={28} color={Colors.primary} />
          </View>

          <Text style={{ fontSize: FontSize.xl, fontWeight: '900', color: Colors.text }}>
            {step.title}
          </Text>
          <Text style={{ marginTop: Spacing.sm, fontSize: FontSize.md, color: Colors.textSecond, lineHeight: 22 }}>
            {step.body}
          </Text>

          <View style={{ flexDirection: 'row', gap: 6, marginTop: Spacing.lg }}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: i <= index ? Colors.primary : Colors.border,
                }}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
            <Pressable
              onPress={close}
              style={{
                flex: 1,
                height: 48,
                borderRadius: Radius.sm,
                borderWidth: 1,
                borderColor: Colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: Colors.textSecond }}>
                Skip
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (last) {
                  close().catch(() => {});
                } else {
                  setIndex((i) => i + 1);
                }
              }}
              style={{
                flex: 1,
                height: 48,
                borderRadius: Radius.sm,
                backgroundColor: Colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: '#FFFFFF' }}>
                {last ? 'Start' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
