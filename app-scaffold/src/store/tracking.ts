// 📁 cercania/app-scaffold/src/store/tracking.ts
import { create } from 'zustand';
import * as Location from 'expo-location';
import {
  startTracking,
  stopTracking,
  isTrackingActive,
  getLastKnownLocation,
  requestLocationPermissions,
  getLocationPermissionStatus,
  registerFilteredLocationCallback,
  PermissionResult
} from '../services/tracking.service';
import { getSupabase } from '../lib/supabase';

interface TrackingState {
  isTracking: boolean;
  permissions: PermissionResult | null;
  lastLocation: Location.LocationObject | null;
  filteredLocation: { latitude: number; longitude: number } | null;
  error: string | null;
  initializing: boolean;
  init: () => Promise<void>;
  requestPermissions: () => Promise<void>;
  enableTracking: () => Promise<void>;
  disableTracking: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  setFilteredLocation: (loc: { latitude: number; longitude: number }) => void;
}

export const useTracking = create<TrackingState>((set, get) => {
  // Registrar el callback para recibir posiciones filtradas del servicio
  registerFilteredLocationCallback((loc) => set({ filteredLocation: loc }));

  return {
  isTracking: false,
  permissions: null,
  lastLocation: null,
  filteredLocation: null,
  error: null,
  initializing: true,
  setFilteredLocation: (loc) => set({ filteredLocation: loc }),

  init: async () => {
    set({ initializing: true, error: null });
    try {
      const [perms, isRunning, lastLoc] = await Promise.all([
        getLocationPermissionStatus(),
        isTrackingActive(),
        getLastKnownLocation()
      ]);

      const sb = await getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: settings } = await sb
          .from('user_settings')
          .select('tracking_enabled')
          .eq('user_id', user.id)
          .single();
        if (settings?.tracking_enabled && perms.background && !isRunning) {
          await startTracking().catch(() => { });
        }
      }

      set({
        permissions: perms,
        isTracking: await isTrackingActive(),
        lastLocation: lastLoc,
        initializing: false
      });
    } catch (e: any) {
      set({ error: e.message, initializing: false });
    }
  },

  requestPermissions: async () => {
    const result = await requestLocationPermissions();
    set({ permissions: result });
    if (result.background) {
      await get().enableTracking();
    }
  },

  enableTracking: async () => {
    set({ error: null });
    try {
      await startTracking();
      const sb = await getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        await sb.from('user_settings').update({ tracking_enabled: true }).eq('user_id', user.id);
      }
      set({ isTracking: true });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  disableTracking: async () => {
    await stopTracking();
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      await sb.from('user_settings').update({ tracking_enabled: false }).eq('user_id', user.id);
    }
    set({ isTracking: false });
  },

  refreshLocation: async () => {
    const loc = await getLastKnownLocation();
    set({ lastLocation: loc });
  }
  };
});