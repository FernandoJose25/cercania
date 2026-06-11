// 📁 cercania/app-scaffold/src/store/auth.ts
/**
 * Store de autenticación optimizado.
 * - Carga la sesión en paralelo con el profile y settings
 * - No bloquea la UI mientras espera
 */
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import { Profile, UserSettings } from '../types/index';

interface AuthState {
  initializing: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  settings: UserSettings | null;
  biometricGateOpen: boolean;
  init: () => Promise<void>;
  setSession: (s: Session | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  openBiometricGate: () => void;
  closeBiometricGate: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  initializing: true,
  session: null,
  user: null,
  profile: null,
  settings: null,
  biometricGateOpen: false,

  init: async () => {
    try {
      const sb = await getSupabase();

      // Cargar sesión — operación más rápida primero
      const { data: { session } } = await sb.auth.getSession();

      // Si hay sesión, cargar perfil en paralelo sin bloquear
      if (session) {
        set({ session, user: session.user, initializing: false });
        // Cargar perfil en background (no bloquea la navegación)
        get().refreshProfile();
      } else {
        set({ session: null, user: null, initializing: false });
      }

      // Escuchar cambios de sesión
      sb.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession) {
          set({ session: newSession, user: newSession.user });
          get().refreshProfile();
          const s = get().settings;
          if (s?.biometric_enabled) set({ biometricGateOpen: true });
        } else {
          set({
            session: null, user: null,
            profile: null, settings: null,
            biometricGateOpen: false
          });
        }
      });
    } catch (e) {
      // Si falla, igual salir del estado de carga
      set({ initializing: false });
    }
  },

  setSession: async (session) => {
    set({ session, user: session?.user ?? null });
    if (session) {
      await get().refreshProfile();
      const s = get().settings;
      if (s?.biometric_enabled) set({ biometricGateOpen: true });
    } else {
      set({ profile: null, settings: null, biometricGateOpen: false });
    }
  },

  refreshProfile: async () => {
    const sb = await getSupabase();
    const userId = get().user?.id;
    if (!userId) return;

    try {
      const [{ data: profile }, { data: settings }] = await Promise.all([
        sb.from('profiles').select('*').eq('id', userId).single(),
        sb.from('user_settings').select('*').eq('user_id', userId).single()
      ]);
      set({ profile: profile as Profile, settings: settings as UserSettings });
    } catch (e) {
      // No crítico si falla
    }
  },

  signOut: async () => {
    const sb = await getSupabase();
    await sb.auth.signOut();
    set({ session: null, user: null, profile: null, settings: null, biometricGateOpen: false });
  },

  openBiometricGate: () => set({ biometricGateOpen: true }),
  closeBiometricGate: () => set({ biometricGateOpen: false })
}));