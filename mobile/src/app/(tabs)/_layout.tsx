import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Truck, ShieldCheck } from 'lucide-react-native';
import { useClientOnlyValue } from '@/lib/useClientOnlyValue';
import { Colors } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecond,
        tabBarStyle: { borderTopColor: Colors.border },
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarButtonTestID: 'tab-home',
          tabBarIcon: ({ color }: { color: string }) => <Home size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="trucks"
        options={{
          title: 'गाड़ियां',
          tabBarButtonTestID: 'tab-trucks',
          tabBarIcon: ({ color }: { color: string }) => <Truck size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="auth"
        options={{
          title: 'Authorize',
          tabBarButtonTestID: 'tab-auth',
          tabBarIcon: ({ color }: { color: string }) => <ShieldCheck size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
