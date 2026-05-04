import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const STORAGE_KEY = 'today_slip_counter';

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export async function getNextSlipNumber(shopId: string): Promise<number> {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'shops', shopId, 'inquiries'),
      where('date', '>=', startOfToday.getTime()),
      orderBy('slipNumber', 'desc'),
      limit(1)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
      const last = snap.docs[0].data().slipNumber as number;
      const next = last + 1;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ key: getTodayKey(), value: next }));
      return next;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ key: getTodayKey(), value: 1001 }));
    return 1001;
  } catch {
    // Firestore unavailable — fall back to AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { key, value } = JSON.parse(raw) as { key: string; value: number };
        if (key === getTodayKey()) {
          const next = value + 1;
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ key: getTodayKey(), value: next }));
          return next;
        }
      }
    } catch {
      // storage also failed
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ key: getTodayKey(), value: 1001 }));
    return 1001;
  }
}
