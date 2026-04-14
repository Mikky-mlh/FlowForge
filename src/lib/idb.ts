import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface FlowForgeDB extends DBSchema {
  syncQueue: {
    key: string;
    value: {
      id: string;
      action: 'ADD' | 'UPDATE' | 'DELETE';
      collection: string;
      data: any;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<FlowForgeDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<FlowForgeDB>('flowforge-db', 1, {
      upgrade(db) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
};

export const addToSyncQueue = async (action: 'ADD' | 'UPDATE' | 'DELETE', collection: string, data: any) => {
  const db = await initDB();
  const id = data.id || crypto.randomUUID();
  await db.put('syncQueue', {
    id,
    action,
    collection,
    data,
    timestamp: Date.now(),
  });
};

export const getSyncQueue = async () => {
  const db = await initDB();
  return db.getAll('syncQueue');
};

export const removeFromSyncQueue = async (id: string) => {
  const db = await initDB();
  await db.delete('syncQueue', id);
};
