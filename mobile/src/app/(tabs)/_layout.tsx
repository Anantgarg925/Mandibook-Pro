import React from 'react';
import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Truck, ClipboardList, BarChart2 } from 'lucide-react-native';
import { useClientOnlyValue } from '@/lib/useClientOnlyValue';
import { Colors } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecond,
        tabBarStyle: { display: 'none' },
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarButtonTestID: 'tab-home',
          tabBarIcon: ({ color }: { color: string }) => <Home size={22} color={color} />,
          tabBarLabel: ({ color }: { color: string }) => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color }}>HOME /</Text>
              <Text style={{ fontSize: 8, color: color + '99' }}>होम</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="trucks"
        options={{
          title: 'Trucks',
          tabBarButtonTestID: 'tab-trucks',
          tabBarIcon: ({ color }: { color: string }) => <Truck size={22} color={color} />,
          tabBarLabel: ({ color }: { color: string }) => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color }}>TRUCKS /</Text>
              <Text style={{ fontSize: 8, color: color + '99' }}>ट्रक</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: 'Bills',
          tabBarButtonTestID: 'tab-bills',
          tabBarIcon: ({ color }: { color: string }) => <ClipboardList size={22} color={color} />,
          tabBarLabel: ({ color }: { color: string }) => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color }}>BILLS /</Text>
              <Text style={{ fontSize: 8, color: color + '99' }}>बिल</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarButtonTestID: 'tab-reports',
          tabBarIcon: ({ color }: { color: string }) => <BarChart2 size={22} color={color} />,
          tabBarLabel: ({ color }: { color: string }) => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color }}>REPORTS /</Text>
              <Text style={{ fontSize: 8, color: color + '99' }}>रिपोर्ट</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen name="auth" options={{ href: null }} />
      <Tabs.Screen name="two" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
