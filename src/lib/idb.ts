import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncQueueItem {
  id: string;
  action: 'ADD' | 'UPDATE' | 'DELETE';
  collection: string;
  data: any;
  timestamp: number;
}

interface FlowForgeDB extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncQueueItem;
  };
}

const DB_NAME = 'flowforge-db';
const STORE_NAME = 'syncQueue';
const LS_KEY = 'flowforge_sync_queue';

let dbPromise: Promise<IDBPDatabase<FlowForgeDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<FlowForgeDB>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

const getLocalStorageQueue = (): SyncQueueItem[] => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
};

const setLocalStorageQueue = (queue: SyncQueueItem[]) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
};

export const addToSyncQueue = async (action: 'ADD' | 'UPDATE' | 'DELETE', collection: string, data: any): Promise<void> => {
  const item: SyncQueueItem = {
    id: data.id || crypto.randomUUID(),
    action,
    collection,
    data,
    timestamp: Date.now(),
  };

  try {
    const db = await initDB();
    await db.put(STORE_NAME, item);
  } catch (e) {
    console.warn('IndexedDB failed, using localStorage fallback', e);
    const queue = getLocalStorageQueue();
    queue.push(item);
    setLocalStorageQueue(queue);
  }
};

export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
  try {
    const db = await initDB();
    return await db.getAll(STORE_NAME);
  } catch (e) {
    console.warn('IndexedDB failed, using localStorage fallback', e);
    return getLocalStorageQueue();
  }
};

export const removeFromSyncQueue = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
  } catch (e) {
    console.warn('IndexedDB failed, using localStorage fallback', e);
    const queue = getLocalStorageQueue();
    const filtered = queue.filter(item => item.id !== id);
    setLocalStorageQueue(filtered);
  }
};

export const clearSyncQueue = async (): Promise<void> => {
  try {
    const db = await initDB();
    await db.clear(STORE_NAME);
  } catch (e) {
    console.warn('IndexedDB failed, using localStorage fallback', e);
    setLocalStorageQueue([]);
  }
};