// 📁 cercania/app-scaffold/src/services/tracking.service.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';
import { getSupabase } from '../lib/supabase';
import { gpsKalman } from '../utils/kalman';

export const TRACKING_TASK = 'CERCANIA_LOCATION_TASK';

const BG_INTERVAL_MS = 3 * 60 * 1000;
const BG_DISTANCE_M = 15;
const FG_INTERVAL_MS = 1000;
const FG_DISTANCE_M = 2;
const LOW_BATTERY = 15;
const SAVER_BG_INTERVAL_MS = 10 * 60 * 1000;

// Filtros duros (antes del Kalman)
const MAX_ACCURACY_M = 25;     // Rechazar lecturas con error > 25m
const MAX_SPEED_MPS = 55;      // Rechazar velocidades > 55 m/s (~200 km/h)
const MIN_MOVEMENT_M = 3;      // Ignorar movimientos < 3m si speed ≈ 0

let _lastLat: number | null = null;
let _lastLng: number | null = null;
let _fgSubscription: Location.LocationSubscription | null = null;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidLocation(location: Location.LocationObject): boolean {
  const { accuracy, speed } = location.coords;

  // Rechazar baja precisión
  if (accuracy != null && accuracy > MAX_ACCURACY_M) return false;

  // Rechazar velocidades imposibles
  if (speed != null && speed > MAX_SPEED_MPS) return false;

  // Rechazar micro-movimientos cuando está quieto
  if (_lastLat != null && _lastLng != null && (speed == null || speed < 0.5)) {
    const dist = haversineMeters(
      _lastLat, _lastLng,
      location.coords.latitude, location.coords.longitude
    );
    if (dist < MIN_MOVEMENT_M) return false;
  }

  return true;
}

// =====================================================================
// TAREA DE BACKGROUND
// =====================================================================
TaskManager.defineTask(TRACKING_TASK, async ({ data, error }: any) => {
  if (error) { console.warn('[Tracking BG]', error.message); return; }
  if (!data?.locations?.length) return;
  const location: Location.LocationObject = data.locations[data.locations.length - 1];
  if (!isValidLocation(location)) return;
  await sendLocation(location);
});

// =====================================================================
// ENVIAR A SUPABASE (con Kalman aplicado)
// =====================================================================
async function sendLocation(location: Location.LocationObject): Promise<void> {
  try {
    const { latitude, longitude, accuracy, speed, heading, altitude } = location.coords;

    // Aplicar filtro de Kalman para suavizar la posición
    const filtered = gpsKalman.process(
      latitude,
      longitude,
      accuracy ?? 10,
      location.timestamp
    );

    let batteryLevel: number | null = null;
    let isCharging: boolean | null = null;
    try {
      batteryLevel = Math.round((await Battery.getBatteryLevelAsync()) * 100);
      const state = await Battery.getBatteryStateAsync();
      isCharging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
    } catch (_) { }

    _lastLat = filtered.lat;
    _lastLng = filtered.lng;

    const sb = await getSupabase();
    await sb.rpc('update_location', {
      p_lat: filtered.lat,      // Posición suavizada por Kalman
      p_lng: filtered.lng,      // Posición suavizada por Kalman
      p_accuracy: accuracy,
      p_speed: speed,
      p_heading: heading,
      p_altitude: altitude,
      p_battery_level: batteryLevel,
      p_is_charging: isCharging,
      p_is_moving: (speed ?? 0) > 0.5,
      p_activity: null
    });
  } catch (e: any) {
    console.warn('[Tracking] Error:', e.message);
  }
}

// =====================================================================
// PERMISOS
// =====================================================================
export interface PermissionResult {
  foreground: boolean;
  background: boolean;
  canAskAgain: boolean;
}

export async function requestLocationPermissions(): Promise<PermissionResult> {
  const { status: fgStatus, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return { foreground: false, background: false, canAskAgain };
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  return { foreground: true, background: bgStatus === 'granted', canAskAgain: true };
}

export async function getLocationPermissionStatus(): Promise<PermissionResult> {
  const fg = await Location.getForegroundPermissionsAsync();
  const bg = await Location.getBackgroundPermissionsAsync();
  return {
    foreground: fg.status === 'granted',
    background: bg.status === 'granted',
    canAskAgain: fg.canAskAgain
  };
}

// =====================================================================
// BACKGROUND
// =====================================================================
export async function startTracking(): Promise<void> {
  const perms = await getLocationPermissionStatus();
  if (!perms.background) throw new Error('Se necesita permiso de ubicación en segundo plano');

  const isRunning = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK).catch(() => false);
  if (isRunning) return;

  let interval = BG_INTERVAL_MS;
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level * 100 <= LOW_BATTERY) interval = SAVER_BG_INTERVAL_MS;
  } catch (_) { }

  await Location.startLocationUpdatesAsync(TRACKING_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: interval,
    distanceInterval: BG_DISTANCE_M,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.OtherNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: Platform.OS === 'android' ? {
      notificationTitle: 'Cercanía activa',
      notificationBody: 'Tu familia puede ver tu ubicación',
      notificationColor: '#F59E0B'
    } : undefined
  });
}

export async function stopTracking(): Promise<void> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK).catch(() => false);
  if (isRunning) await Location.stopLocationUpdatesAsync(TRACKING_TASK);
  await stopForegroundTracking();
}

export async function isTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(TRACKING_TASK).catch(() => false);
}

// =====================================================================
// FOREGROUND (tiempo real)
// =====================================================================
export async function startForegroundTracking(
  onLocation: (loc: Location.LocationObject) => void
): Promise<void> {
  await stopForegroundTracking();
  const perms = await getLocationPermissionStatus();
  if (!perms.foreground) return;

  _fgSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: FG_INTERVAL_MS,
      distanceInterval: FG_DISTANCE_M
    },
    async (location) => {
      if (!isValidLocation(location)) return;
      await sendLocation(location);
      onLocation(location);
    }
  );
}

export async function stopForegroundTracking(): Promise<void> {
  if (_fgSubscription) {
    _fgSubscription.remove();
    _fgSubscription = null;
  }
}

export async function getLastKnownLocation(): Promise<Location.LocationObject | null> {
  return Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000, requiredAccuracy: 100 });
}

export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    const perms = await getLocationPermissionStatus();
    if (!perms.foreground) return null;
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });
    if (isValidLocation(location)) await sendLocation(location);
    return location;
  } catch (e) {
    return getLastKnownLocation();
  }
}