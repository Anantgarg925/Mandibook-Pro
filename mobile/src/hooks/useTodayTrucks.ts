import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useShop } from '@/context/ShopContext';
import type { Truck } from '@/types/truck';

export function useTodayTrucks() {
  const { shop } = useShop();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shop?.shopId) {
      setLoading(false);
      return;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'shops', shop.shopId, 'trucks'),
      where('date', '>=', startOfToday.getTime()),
      where('date', '<=', endOfToday.getTime()),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Truck);
        setTrucks(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[Firestore] useTodayTrucks error:', err.code, err.message);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [shop?.shopId]);

  return { trucks, loading, error };
}
