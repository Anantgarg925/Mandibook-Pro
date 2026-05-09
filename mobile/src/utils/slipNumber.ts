import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api';
import type { Inquiry } from '@/types/inquiry';

const STORAGE_KEY = 'today_slip_counter';

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export async function getNextSlipNumber(shopId: string): Promise<number> {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const inquiries = await api.get<Inquiry[]>(
      `/api/inquiries?shopId=${shopId}&date=${startOfToday.getTime()}`
    );

    const maxSlip = inquiries.reduce((max, inq) => Math.max(max, inq.slipNumber ?? 0), 0);
    const next = maxSlip > 0 ? maxSlip + 1 : 1001;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ key: getTodayKey(), value: next }));
    return next;
  } catch {
    // API unavailable — fall back to AsyncStorage
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
