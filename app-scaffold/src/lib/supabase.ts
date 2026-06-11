/**
 * Cliente de Supabase.
 *
 * Detalles importantes:
 * - Usa secureStorage (Keychain/EncryptedSharedPrefs) por defecto.
 * - autoRefreshToken: el SDK renueva el access token usando el refresh token
 *   sin intervención del usuario (la sesión "30 días" se logra así).
 * - persistSession: guarda la sesión entre cierres de la app.
 * - Para login efímero (sin "mantener sesión"), se usa memoryStorage al inicializar.
 */

import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { secureStorage, memoryStorage, getStorageMode } from './secureStorage';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra?.SUPABASE_URL as string);

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra?.SUPABASE_ANON_KEY as string);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

let _client: SupabaseClient | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  if (_client) return _client;

  const mode = await getStorageMode();
  const storage = mode === 'memory' ? memoryStorage : secureStorage;

  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: storage as any,
      autoRefreshToken: true,
      persistSession: mode === 'persist',
      detectSessionInUrl: false,
      flowType: 'pkce'
    },
    global: {
      headers: { 'x-client-info': 'cercania-mobile' }
    }
  });

  return _client;
}

/** Forzar recreación del cliente cuando cambia el modo de storage tras login */
export async function rebuildSupabase() {
  _client = null;
  return getSupabase();
}

/** Acceso sync para módulos ya inicializados; lanza si aún no se llamó getSupabase() */
export function supabase(): SupabaseClient {
  if (!_client) {
    throw new Error('Supabase no inicializado. Llama getSupabase() en el bootstrap.');
  }
  return _client;
}
