import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

// expo-notifications is native-only and not supported in Expo Go SDK 53+; lazy-load to prevent crashes
let Notifications: typeof import('expo-notifications') | null = null;
if (Platform.OS !== 'web' && !isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch {
    Notifications = null;
  }
}

import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';

type BillNotificationContextValue = {
  unreadCount: number;
  clearUnread: () => Promise<void>;
};

const BillNotificationContext = createContext<BillNotificationContextValue>({
  unreadCount: 0,
  clearUnread: async () => {},
});

const storageKey = (shopId?: string) => `mandibook_bill_notification_unread_${shopId ?? 'none'}`;

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function prepareNotificationSound() {
  if (!Notifications) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    await Notifications.requestPermissionsAsync();
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('new-bills', {
      name: 'New bills',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 120, 250],
    });
  }
}

export function BillNotificationProvider({ children }: { children: React.ReactNode }) {
  const { shop } = useShop();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const readyRef = useRef(false);

  useEffect(() => {
    prepareNotificationSound()
      .then(() => {
        readyRef.current = true;
      })
      .catch(() => {
        readyRef.current = false;
      });
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey(shop?.shopId))
      .then((raw) => {
        if (active) setUnreadCount(raw ? Number(raw) || 0 : 0);
      })
      .catch(() => {
        if (active) setUnreadCount(0);
      });

    return () => {
      active = false;
    };
  }, [shop?.shopId]);

  useEffect(() => {
    if (!shop?.shopId) return;

    const channel = supabase
      .channel(`new-bill-notifications-${shop.shopId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inquiries',
          filter: `shop_id=eq.${shop.shopId}`,
        },
        async (payload) => {
          const bill = payload.new as {
            id?: string;
            slip_number?: number;
            customer_name?: string;
            grade?: string;
            net_amount?: number;
          };

          queryClient.invalidateQueries({ queryKey: ['inquiries', shop.shopId] });
          queryClient.invalidateQueries({ queryKey: ['trucks', shop.shopId] });

          setUnreadCount((current) => {
            const next = current + 1;
            AsyncStorage.setItem(storageKey(shop.shopId), String(next)).catch(() => {});
            return next;
          });

          if (Platform.OS !== 'web') Vibration.vibrate([0, 180, 90, 180]);

          if (readyRef.current && Notifications) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `New Bill #${bill.slip_number ?? ''}`,
                body: `${bill.customer_name ?? 'Customer'} - ${bill.grade ?? 'Grade'} inquiry added`,
                sound: 'default',
                data: { billId: bill.id, type: 'new_bill' },
              },
              trigger: null,
            }).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, shop?.shopId]);

  const clearUnread = useCallback(
    async () => {
      setUnreadCount(0);
      await AsyncStorage.setItem(storageKey(shop?.shopId), '0');
    },
    [shop?.shopId]
  );

  const value = useMemo(
    () => ({
      unreadCount,
      clearUnread,
    }),
    [clearUnread, unreadCount]
  );

  return (
    <BillNotificationContext.Provider value={value}>
      {children}
    </BillNotificationContext.Provider>
  );
}

export function useBillNotifications() {
  return useContext(BillNotificationContext);
}
