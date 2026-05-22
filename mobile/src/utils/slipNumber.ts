import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getBusinessDateKey, getBusinessDateRange, getCurrentBusinessDate } from '@/lib/businessDay';

const STORAGE_KEY = 'today_slip_counter';

export async function getNextSlipNumber(shopId: string, date = getCurrentBusinessDate()): Promise<number> {
  const { startMs, endMs } = getBusinessDateRange(date);
  const storageKey = getBusinessDateKey(date);

  try {
    const { data, error } = await supabase
      .from('inquiries')
      .select('slip_number')
      .eq('shop_id', shopId)
      .gte('date', startMs)
      .lte('date', endMs)
      .order('slip_number', { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);

    const maxSlip = data && data.length > 0 ? (data[0].slip_number as number) : 0;
    const next = maxSlip > 0 ? maxSlip + 1 : 1001;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ key: storageKey, value: next }));
    return next;
  } catch {
    // Supabase unavailable — fall back to AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { key, value } = JSON.parse(raw) as { key: string; value: number };
        if (key === storageKey) {
          const next = value + 1;
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ key: storageKey, value: next }));
          return next;
        }
      }
    } catch {
      // storage also failed
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ key: storageKey, value: 1001 }));
    return 1001;
  }
}
