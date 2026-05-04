import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useShop } from '@/context/ShopContext';
import type { CashEntry } from '@/utils/pdfGenerator';

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useCashEntries(date: Date) {
  const { shop } = useShop();
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const key = dateKey(date);

  useEffect(() => {
    if (!shop?.shopId) return;
    const q = query(
      collection(db, 'shops', shop.shopId, 'daySummary', key, 'cashEntries'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      snap => {
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as CashEntry)));
        setLoading(false);
      },
      _err => {
        setLoading(false);
      }
    );
    return unsub;
  }, [shop?.shopId, key]);

  const addEntry = async (entry: Omit<CashEntry, 'id'>) => {
    if (!shop?.shopId) return;
    await addDoc(collection(db, 'shops', shop.shopId, 'daySummary', key, 'cashEntries'), entry);
  };

  return { entries, loading, addEntry };
}
