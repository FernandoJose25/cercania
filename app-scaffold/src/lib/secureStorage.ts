/**
 * Adapter de almacenamiento seguro para Supabase Auth.
 * Usa expo-secure-store (Keychain en iOS / EncryptedSharedPreferences en Android).
 * Mucho más seguro que AsyncStorage para tokens.
 *
 * Si keepLoggedIn=false, usamos memoria volátil (los tokens se pierden al cerrar app).
 */

import * as SecureStore from 'expo-secure-store';

// Almacenamiento en memoria (cuando el usuario NO quiere mantener sesión)
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return Promise.resolve(this.data.get(key) ?? null); }
  setItem(key: string, value: string) { this.data.set(key, value); return Promise.resolve(); }
  removeItem(key: string) { this.data.delete(key); return Promise.resolve(); }
}

// SecureStore tiene límite de 2KB por valor. Para tokens largos partimos en chunks.
const CHUNK_SIZE = 1800;

class ChunkedSecureStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      const meta = await SecureStore.getItemAsync(`${key}__meta`);
      if (!meta) {
        // Compatibilidad con valores no chunkeados
        return await SecureStore.getItemAsync(key);
      }
      const chunkCount = parseInt(meta, 10);
      const chunks: string[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const c = await SecureStore.getItemAsync(`${key}__${i}`);
        if (c === null) return null;
        chunks.push(c);
      }
      return chunks.join('');
    } catch (e) {
      console.warn('[SecureStorage] getItem error', e);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.deleteItemAsync(`${key}__meta`).catch(() => {});
        await SecureStore.setItemAsync(key, value);
        return;
      }
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(`${key}__${i}`, c)));
      await SecureStore.setItemAsync(`${key}__meta`, String(chunks.length));
      await SecureStore.deleteItemAsync(key).catch(() => {});
    } catch (e) {
      console.warn('[SecureStorage] setItem error', e);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const meta = await SecureStore.getItemAsync(`${key}__meta`);
      if (meta) {
        const count = parseInt(meta, 10);
        await Promise.all([
          ...Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}__${i}`)),
          SecureStore.deleteItemAsync(`${key}__meta`)
        ]);
      }
      await SecureStore.deleteItemAsync(key).catch(() => {});
    } catch (e) {
      console.warn('[SecureStorage] removeItem error', e);
    }
  }
}

export const secureStorage = new ChunkedSecureStorage();
export const memoryStorage = new MemoryStorage();

const STORAGE_MODE_KEY = '__cercania_storage_mode';

export async function setStorageMode(keepLoggedIn: boolean) {
  await SecureStore.setItemAsync(STORAGE_MODE_KEY, keepLoggedIn ? 'persist' : 'memory');
}

export async function getStorageMode(): Promise<'persist' | 'memory'> {
  const v = await SecureStore.getItemAsync(STORAGE_MODE_KEY).catch(() => null);
  return v === 'memory' ? 'memory' : 'persist';
}
