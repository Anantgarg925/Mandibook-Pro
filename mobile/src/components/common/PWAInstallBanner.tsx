import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Download } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PWAInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Check if user dismissed it previously
    AsyncStorage.getItem('PWA_INSTALL_DISMISSED').then((dismissed) => {
      if (dismissed === 'true') return;

      const handler = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
        setShowBanner(true);
      };

      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    });
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowBanner(false);
    }
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem('PWA_INSTALL_DISMISSED', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 16, paddingVertical: 12, paddingTop: Math.max(12, insets.top), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10000 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Download size={20} color="#1E3A8A" />
        <Text style={{ fontSize: 13, color: '#1E3A8A', fontWeight: '600', marginLeft: 12, flexShrink: 1 }}>
          📲 Install MandiBook Pro for the best offline experience
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={handleInstall} style={{ backgroundColor: '#1E3A8A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Install</Text>
        </Pressable>
        <Pressable onPress={handleDismiss}>
          <Text style={{ color: '#1E3A8A', fontSize: 12 }}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}
