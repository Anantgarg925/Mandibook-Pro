import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useShop } from '@/context/ShopContext';
import type { Buyer, Transaction } from '@/types/inquiry';

export function useBuyers() {
  const { shop } = useShop();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop?.shopId) return;
    const q = query(
      collection(db, 'shops', shop.shopId, 'buyers'),
      orderBy('name', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBuyers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Buyer)));
        setLoading(false);
      },
      _err => {
        setLoading(false);
      }
    );
    return unsub;
  }, [shop?.shopId]);

  const getBuyer = (code: string) => buyers.find(b => b.code === code) ?? null;

  return { buyers, loading, getBuyer };
}

export function useBuyerTransactions(buyerCode: string) {
  const { shop } = useShop();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop?.shopId || !buyerCode) return;
    const q = query(
      collection(db, 'shops', shop.shopId, 'buyers', buyerCode, 'transactions'),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
        setLoading(false);
      },
      _err => {
        setLoading(false);
      }
    );
    return unsub;
  }, [shop?.shopId, buyerCode]);

  return { transactions, loading };
}
