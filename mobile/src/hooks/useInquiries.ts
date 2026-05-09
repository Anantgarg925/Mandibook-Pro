import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useShop } from '@/context/ShopContext';
import type { Inquiry } from '@/types/inquiry';

export function useInquiries() {
  const { shop } = useShop();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shop?.shopId) {
      setLoading(false);
      return;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'shops', shop.shopId, 'inquiries'),
      where('date', '>=', startOfToday.getTime()),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Inquiry);
        setInquiries(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[Firestore] useInquiries error:', err.code, err.message);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [shop?.shopId]);

  const pending = inquiries.filter((i) => i.status === 'PENDING');
  const confirmed = inquiries.filter((i) => i.status === 'CONFIRMED');
  const udhaari = inquiries.filter((i) => i.paymentMode === 'UDHAARI');

  const byTruck = useCallback(
    (truckId: string) => inquiries.filter((i) => i.truckId === truckId),
    [inquiries]
  );

  return { inquiries, pending, confirmed, udhaari, byTruck, loading, error };
}
