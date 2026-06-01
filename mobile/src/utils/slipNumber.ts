import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export async function getNextSlipNumber(shopId: string, offsetBase = 0): Promise<number> {
  const userStorageKey = `continuous_slip_counter_${offsetBase}`;

  try {
    let supabaseQuery = supabase
      .from('inquiries')
      .select('slip_number')
      .eq('shop_id', shopId);

    if (offsetBase > 0) {
      supabaseQuery = supabaseQuery
        .gte('slip_number', offsetBase)
        .lt('slip_number', offsetBase + 10000);
    } else {
      supabaseQuery = supabaseQuery
        .lt('slip_number', 10000); // Admin slips are < 10000
    }

    const supabasePromise = supabaseQuery
      .order('slip_number', { ascending: false })
      .limit(1);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), 2500)
    );

    const { data, error } = await Promise.race([supabasePromise, timeoutPromise]) as any;

    if (error) throw new Error(error.message);

    const maxSlip = data && data.length > 0 ? (data[0].slip_number as number) : 0;
    const next = maxSlip > 0 ? maxSlip + 1 : (offsetBase > 0 ? offsetBase + 1 : 1001);
    await AsyncStorage.setItem(userStorageKey, String(next));
    return next;
  } catch {
    // Supabase unavailable — fall back to AsyncStorage continuous value
    try {
      const raw = await AsyncStorage.getItem(userStorageKey);
      if (raw) {
        const val = parseInt(raw, 10);
        if (!isNaN(val)) {
          const next = val + 1;
          await AsyncStorage.setItem(userStorageKey, String(next));
          return next;
        }
      }
    } catch {
      // storage also failed
    }
    const defaultStart = offsetBase > 0 ? offsetBase + 1 : 1001;
    await AsyncStorage.setItem(userStorageKey, String(defaultStart));
    return defaultStart;
  }
}
