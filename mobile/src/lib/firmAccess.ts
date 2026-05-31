import AsyncStorage from '@react-native-async-storage/async-storage';

export const getFirmUnlockKey = (shopId: string) => `mandibook_firm_unlock:${shopId}`;

export async function isFirmUnlocked(shopId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(getFirmUnlockKey(shopId));
  return value === '1';
}

export async function markFirmUnlocked(shopId: string): Promise<void> {
  await AsyncStorage.setItem(getFirmUnlockKey(shopId), '1');
}
