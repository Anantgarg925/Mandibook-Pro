import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api';

export type Grade = { code: string; name: string };

export type ShopCharges = {
  apmcCommission: number;
  agentCommission: number;
  bardanaPerSack: number;
  cartagePerKg: number;
  telePost: number;
};

export type ShopData = {
  shopId: string;
  firmName: string;
  ownerName: string;
  address: string;
  city: string;
  phone1: string;
  phone2: string;
  upiId: string;
  upiApps: string[];
  commodity: string;
  grades: Grade[];
  charges: ShopCharges;
  adminPin: string;
  teamNames: string[];
  createdAt: number;
};

const DEFAULT_SHOP: Omit<ShopData, 'shopId' | 'createdAt'> = {
  firmName: '',
  ownerName: '',
  address: '',
  city: '',
  phone1: '',
  phone2: '',
  upiId: '',
  upiApps: [],
  commodity: 'Mosambi',
  grades: [
    { code: 'I', name: 'Large (बड़ा)' },
    { code: 'II', name: 'Medium (मध्यम)' },
    { code: 'III', name: 'Small (छोटा)' },
    { code: 'IV', name: 'Extra Small' },
    { code: 'V', name: 'Goli (गोली)' },
    { code: 'KP', name: 'Kala Peela' },
    { code: 'PILA', name: 'Peela (पीला)' },
    { code: 'CHURA', name: 'Churaa (चूरा)' },
  ],
  charges: {
    apmcCommission: 1,
    agentCommission: 6,
    bardanaPerSack: 5,
    cartagePerKg: 0,
    telePost: 0,
  },
  adminPin: '',
  teamNames: [],
};

const STORAGE_KEY = 'mandibook_shop';

type ShopContextType = {
  shop: ShopData | null;
  loading: boolean;
  updateShop: (data: Partial<ShopData>) => Promise<void>;
  saveShop: (data: ShopData) => Promise<void>;
  grades: Grade[];
  charges: ShopCharges;
};

const ShopContext = createContext<ShopContextType | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      console.log('[SHOP] Loading shop data...');
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        console.log('[SHOP] Cache result:', cached ? 'found' : 'empty');
        if (cached) {
          const parsed: ShopData = JSON.parse(cached);
          setShop(parsed);
          setLoading(false);
          console.log('[SHOP] Loaded from cache, firmName:', parsed.firmName);
          // Background sync from API
          try {
            const remote = await api.get<ShopData>(`/api/shops/${parsed.shopId}`);
            if (remote) {
              setShop(remote);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
            }
          } catch (err: any) {
            if (err?.message === 'Shop not found') {
              // Shop exists locally but not in backend (e.g. created with wrong ID).
              // Re-create it with the correct ID so trucks can be linked to it.
              api.post('/api/shops', { ...parsed, id: parsed.shopId }).catch(() => {});
            }
            // Other errors (network, etc.) — keep using local cache silently.
          }
        } else {
          console.log('[SHOP] No cached shop, first run');
          setLoading(false);
        }
      } catch (e) {
        console.log('[SHOP] Load error:', e);
        setLoading(false);
      }
    }
    load();
  }, []);

  const syncFromApi = async (shopId: string): Promise<ShopData | null> => {
    try {
      const data = await api.get<ShopData>(`/api/shops/${shopId}`);
      if (data) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch (err: any) {
      console.warn('[API] Sync failed:', err?.message);
    }
    return null;
  };

  const saveShop = useCallback(async (data: ShopData) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setShop(data);
    try {
      // Try to update via API; if shop doesn't exist yet, create it
      try {
        await api.put<ShopData>(`/api/shops/${data.shopId}`, data);
      } catch {
        await api.post<ShopData>('/api/shops', { ...data, id: data.shopId });
      }
    } catch (err: any) {
      console.warn('[API] Save failed (will use local cache):', err?.message);
    }
  }, []);

  const updateShop = useCallback(
    async (partial: Partial<ShopData>) => {
      if (!shop) return;
      const updated = { ...shop, ...partial };
      await saveShop(updated);
    },
    [shop, saveShop]
  );

  return (
    <ShopContext.Provider
      value={{
        shop,
        loading,
        updateShop,
        saveShop,
        grades: shop?.grades ?? DEFAULT_SHOP.grades,
        charges: shop?.charges ?? DEFAULT_SHOP.charges,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside ShopProvider');
  return ctx;
}

export { DEFAULT_SHOP };
