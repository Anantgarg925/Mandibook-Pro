import { Storage as AsyncStorage } from './offlineDB';

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

import { DeviceEventEmitter } from 'react-native';

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
  DeviceEventEmitter.emit('onQueueUpdate');
  return operation;
}

export async function removeOfflineOperation(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  await AsyncStorage.setItem(
    OFFLINE_QUEUE_KEY,
    JSON.stringify(queue.filter((operation) => operation.id !== id)),
  );
  DeviceEventEmitter.emit('onQueueUpdate');
}

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  DeviceEventEmitter.emit('onQueueUpdate');
}

// Ensure only one sync process runs at a time
let isSyncing = false;

export async function processOfflineQueue(supabaseClient: any): Promise<boolean> {
  if (isSyncing) return false;
  
  const queue = await getOfflineQueue();
  if (queue.length === 0) return false;
  
  isSyncing = true;
  let syncedAny = false;
  try {
    // Sort oldest first
    const sortedQueue = [...queue].sort((a, b) => a.createdAt - b.createdAt);
    
    for (const operation of sortedQueue) {
      if (operation.type === 'CREATE_INQUIRY') {
        const payload = operation.payload as any;
        
        // Use the Supabase RPC for atomic stock validation
        const { data, error } = await supabaseClient.rpc('sync_offline_bill', {
          bill_payload: payload.inquiry
        });
        
        if (error) {
          // If network error, stop sync and try again later
          if (error.message && error.message.toLowerCase().includes('fetch')) {
            break;
          }
          console.error('Error syncing bill:', error);
        }
        
        // If the RPC succeeded (returned accepted or conflict), it's safely in the database.
        if (data && (data.status === 'accepted' || data.status === 'conflict')) {
          await removeOfflineOperation(operation.id);
          syncedAny = true;
          
          if (payload.buyerUpsert) {
             // Upsert buyer... (simplified)
          }
        }
      } else {
        await removeOfflineOperation(operation.id);
      }
    }
  } finally {
    isSyncing = false;
  }
  return syncedAny;
}
