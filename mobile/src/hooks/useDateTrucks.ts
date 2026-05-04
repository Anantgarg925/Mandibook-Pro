import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useShop } from '@/context/ShopContext';
import type { Truck } from '@/types/truck';

export function useDateTrucks(date: Date) {
  const { shop } = useShop();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop?.shopId) return;
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'shops', shop.shopId, 'trucks'),
      where('date', '>=', start.getTime()),
      where('date', '<=', end.getTime()),
      orderBy('date', 'asc')
    );
    const unsub = onSnapshot(
      q,
      snap => {
        setTrucks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Truck)));
        setLoading(false);
      },
      _err => {
        setLoading(false);
      }
    );
    return unsub;
  }, [shop?.shopId, date.toDateString()]);

  return { trucks, loading };
}
