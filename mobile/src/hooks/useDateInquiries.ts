import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useShop } from '@/context/ShopContext';
import type { Inquiry } from '@/types/inquiry';

export function useDateInquiries(date: Date) {
  const { shop } = useShop();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop?.shopId) return;
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'shops', shop.shopId, 'inquiries'),
      where('date', '>=', start.getTime()),
      where('date', '<=', end.getTime()),
      where('status', '==', 'CONFIRMED'),
      orderBy('date', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setInquiries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Inquiry)));
      setLoading(false);
    });
    return unsub;
  }, [shop?.shopId, date.toDateString()]);

  return { inquiries, loading };
}
