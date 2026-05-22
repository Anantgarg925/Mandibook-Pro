import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, mapShop } from '@/lib/supabase';

export type Grade = { code: string; name: string };

export type ShopCharges = {
  apmcCommission: number;
  agentCommission: number;
  bardanaPerSack: number;
  cartagePerKg: number;
  telePost: number;
};

export type TeamMember = {
  id: string;
  name: string;
  phone: string;
  pin: string;
  role: string;
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
  teamMembers: TeamMember[];
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
  teamMembers: [],
};

const STORAGE_KEY = 'mandibook_shop';

type ShopContextType = {
  shop: ShopData | null;
  loading: boolean;
  cacheShop: (data: ShopData) => Promise<void>;
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
      try {
        // 1. Load from local cache first for instant UI
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed: ShopData = JSON.parse(cached);
          setShop(parsed);
          setLoading(false);
          // 2. Background sync from Supabase
          try {
            const { data, error } = await supabase
              .from('shops')
              .select('*')
              .eq('id', parsed.shopId)
              .single();
            if (!error && data) {
              const remote = mapShop(data as Record<string, unknown>);
              setShop(remote);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
            }
          } catch {
            // Network error — keep using local cache silently
          }
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cacheShop = useCallback(async (data: ShopData) => {
    // Always save locally first
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setShop(data);
  }, []);

  const saveShop = useCallback(async (data: ShopData) => {
    await cacheShop(data);
    try {
      // Upsert to Supabase
      const { error } = await supabase.from('shops').upsert({
        id: data.shopId,
        firm_name: data.firmName,
        owner_name: data.ownerName,
        address: data.address,
        city: data.city,
        phone1: data.phone1,
        phone2: data.phone2,
        upi_id: data.upiId,
        upi_apps: data.upiApps,
        commodity: data.commodity,
        grades: data.grades,
        charges: data.charges,
        admin_pin: null,
        team_names: data.teamMembers.map(m => typeof m === 'string' ? m : JSON.stringify({ ...m, pin: undefined })),
        created_at: data.createdAt,
      });
      if (error) {
        console.warn('[Supabase] saveShop error:', error.message);
      }
      if (data.adminPin) {
        const { error: pinError } = await supabase.rpc('set_shop_admin_pin', {
          p_shop_id: data.shopId,
          p_new_pin: data.adminPin,
          p_current_pin: null,
        });
        if (pinError) {
          console.warn('[Supabase] setShopAdminPin error:', pinError.message);
        }
      }
    } catch (err: unknown) {
      console.warn('[Supabase] saveShop failed (local cache used):', (err as Error).message);
    }
  }, [cacheShop]);

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
        cacheShop,
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
