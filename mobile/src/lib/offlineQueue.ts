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
        
        // Remove the extra properties we added for offline tracking
        const dbInq = { ...payload.inquiry };
        delete dbInq.sync_status;
        delete dbInq.created_offline;
        delete dbInq.optimistic_stock;

        const { data, error } = await supabaseClient
          .from('inquiries')
          .insert(dbInq)
          .select()
          .single();
        
        let isSuccess = false;

        if (error) {
          if (error.code === '23505') {
            // Duplicate key error, treat as success
            isSuccess = true;
          } else {
            const isNetworkError = error.message && (
              error.message.toLowerCase().includes('fetch') ||
              error.message.toLowerCase().includes('network') ||
              error.message.toLowerCase().includes('timeout') ||
              error.message.toLowerCase().includes('connection')
            );
            if (isNetworkError) {
              break; // Stop sync and try again later
            }
            console.error('Error syncing bill permanently:', error);
            // Drop it if it's a permanent constraint error so the queue isn't blocked forever
            isSuccess = true; 
          }
        } else {
          isSuccess = true;
          
          // Process best-effort updates (truck, buyer)
          try {
            if (payload.truckUpdate) {
              await supabaseClient
                .from('trucks')
                .update({ grade_inventory: payload.truckUpdate.gradeInventory })
                .eq('id', payload.truckUpdate.id);
            }
          } catch { /* best-effort */ }
          
          try {
            if (payload.buyerUpsert) {
              const { data: existing } = await supabaseClient
                .from('buyers')
                .select('id')
                .or(`phone.eq.${payload.buyerUpsert.phone},name.ilike.${payload.buyerUpsert.name}`)
                .eq('shop_id', dbInq.shop_id)
                .maybeSingle();

              if (!existing) {
                await supabaseClient.from('buyers').insert({
                  shop_id: dbInq.shop_id,
                  name: payload.buyerUpsert.name,
                  phone: payload.buyerUpsert.phone,
                  preferred_payment_mode: dbInq.payment_mode,
                  last_transaction_date: Date.now(),
                  created_at: Date.now(),
                });
              } else {
                await supabaseClient
                  .from('buyers')
                  .update({ preferred_payment_mode: dbInq.payment_mode })
                  .eq('id', existing.id);
              }
            }
          } catch { /* best-effort */ }
        }
        
        if (isSuccess) {
          await removeOfflineOperation(operation.id);
          syncedAny = true;
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
