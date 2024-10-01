// src/utils/indexedDB.ts

import type { CachedSong } from '~/types';

const DB_NAME = 'MusicPlayerDB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

let db: IDBDatabase | null = null;

// Initialize the IndexedDB
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('r2Id', 'r2Id', { unique: true });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => {
      // Ensure rejection with an Error object
      if (request.error) {
        reject(request.error);
      } else {
        reject(new Error('Failed to initialize IndexedDB'));
      }
    };
  });
};

// Add a song to IndexedDB
export const addSongToDB = async (song: CachedSong): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(song);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error adding song to IndexedDB:', request.error);
      if (request.error) {
        reject(request.error);
      } else {
        reject(new Error('Failed to add song to IndexedDB'));
      }
    };
  });
};

// Get a song from IndexedDB by r2Id
export const getSongFromDB = async (r2Id: string): Promise<CachedSong | undefined> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('r2Id');
    const request = index.get(r2Id);

    request.onsuccess = () => {
      resolve(request.result as CachedSong | undefined);
    };

    request.onerror = () => {
      console.error('Error retrieving song from IndexedDB:', request.error);
      if (request.error) {
        reject(request.error);
      } else {
        reject(new Error('Failed to retrieve song from IndexedDB'));
      }
    };
  });
};

// Get all cached songs from IndexedDB
export const getAllCachedSongs = async (): Promise<CachedSong[]> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as CachedSong[]);
    };

    request.onerror = () => {
      console.error('Error retrieving all songs from IndexedDB:', request.error);
      if (request.error) {
        reject(request.error);
      } else {
        reject(new Error('Failed to retrieve all songs from IndexedDB'));
      }
    };
  });
};

// (Optional) Clear all cached songs
export const clearAllCachedSongs = async (): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error clearing songs from IndexedDB:', request.error);
      if (request.error) {
        reject(request.error);
      } else {
        reject(new Error('Failed to clear songs from IndexedDB'));
      }
    };
  });
};
