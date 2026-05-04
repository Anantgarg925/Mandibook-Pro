import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed: ShopData = JSON.parse(cached);
          setShop(parsed);
          setLoading(false);
          // Background sync from Firestore
          syncFromFirestore(parsed.shopId).then((remote) => {
            if (remote) setShop(remote);
          });
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    }
    load();
  }, []);

  const syncFromFirestore = async (shopId: string): Promise<ShopData | null> => {
    try {
      const snap = await getDoc(doc(db, 'shops', shopId));
      if (snap.exists()) {
        const data = snap.data() as ShopData;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch {
      // offline — cached data already shown
    }
    return null;
  };

  const saveShop = useCallback(async (data: ShopData) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setShop(data);
    try {
      await setDoc(doc(db, 'shops', data.shopId), data);
    } catch {
      // will sync when online
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
