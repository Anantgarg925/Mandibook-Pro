import AsyncStorage from '@react-native-async-storage/async-storage';

export type OfflineOperationType =
  | 'CREATE_TRUCK'
  | 'CREATE_INQUIRY'
  | 'UPDATE_INQUIRY'
  | 'CREATE_BUYER'
  | 'CREATE_TRANSACTION'
  | 'CASHBOOK_ENTRY';

export type OfflineOperation = {
  id: string;
  type: OfflineOperationType;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
};

const OFFLINE_QUEUE_KEY = 'mandibook_offline_queue_v1';

export async function getOfflineQueue(): Promise<OfflineOperation[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineOperation[];
  } catch {
    return [];
  }
}

export async function enqueueOfflineOperation(
  type: OfflineOperationType,
  payload: Record<string, unknown>,
): Promise<OfflineOperation> {
  const queue = await getOfflineQueue();
  const operation: OfflineOperation = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([...queue, operation]));
  return operation;
}

export async function removeOfflineOperation(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  await AsyncStorage.setItem(
    OFFLINE_QUEUE_KEY,
    JSON.stringify(queue.filter((operation) => operation.id !== id)),
  );
}

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}
