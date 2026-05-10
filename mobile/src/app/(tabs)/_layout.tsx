import React from 'react';
import { Platform, View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, FileText, Truck, BarChart2, Settings } from 'lucide-react-native';
import { useClientOnlyValue } from '@/lib/useClientOnlyValue';
import { Colors } from '@/lib/theme';
import { useLaunch } from '@/context/LaunchContext';

export default function TabLayout() {
  const { launchComplete } = useLaunch();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecond,
        tabBarStyle: launchComplete
          ? {
              borderTopColor: Colors.border,
              backgroundColor: Colors.surface,
              paddingBottom: Platform.OS === 'android' ? 8 : 8,
              paddingTop: 4,
              height: Platform.OS === 'android' ? 68 : 60,
            }
          : { display: 'none' },
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
              <Text style={{ fontSize: 10, fontWeight: '600', color }}>Home</Text>
              <Text style={{ fontSize: 8, color: color + '99' }}>होम</Text>
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
          tabBarIcon: ({ color }: { color: string }) => <FileText size={22} color={color} />,
          tabBarLabel: ({ color }: { color: string }) => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color }}>Bills</Text>
              <Text style={{ fontSize: 8, color: color + '99' }}>बिल</Text>
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
              <Text style={{ fontSize: 10, fontWeight: '600', color }}>Trucks</Text>
              <Text style={{ fontSize: 8, color: color + '99' }}>गाड़ियां</Text>
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
              <Text style={{ fontSize: 10, fontWeight: '600', color }}>Reports</Text>
              <Text style={{ fontSize: 8, color: color + '99' }}>रिपोर्ट</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarButtonTestID: 'tab-settings',
          tabBarIcon: ({ color }: { color: string }) => <Settings size={22} color={color} />,
          tabBarLabel: ({ color }: { color: string }) => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color }}>Settings</Text>
              <Text style={{ fontSize: 8, color: color + '99' }}>सेटिंग</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen name="auth" options={{ href: null }} />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
