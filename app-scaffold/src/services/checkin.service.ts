// 📁 cercania/app-scaffold/src/services/checkin.service.ts
import * as ExpoNotifications from 'expo-notifications';
import { getSupabase } from '../lib/supabase';
import { haversineMeters } from '../utils/geo';

const CHECKIN_COOLDOWN_MS = 30 * 60 * 1000; // 30 min entre check-ins del mismo lugar
const lastCheckinTimes: Record<string, number> = {};

export interface GeofenceZone {
  id: string;
  name: string;
  icon: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

/**
 * Verifica si la ubicación actual está dentro de alguna zona y dispara el check-in.
 * Llamar desde el tracker cada vez que se actualiza la posición.
 */
export async function checkGeofenceArrivals(
  latitude: number,
  longitude: number
): Promise<void> {
  try {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { data: zones } = await sb
      .from('geofences')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!zones?.length) return;

    for (const zone of zones as GeofenceZone[]) {
      const dist = haversineMeters(latitude, longitude, zone.latitude, zone.longitude);
      if (dist > zone.radius_meters) continue;

      const now = Date.now();
      const lastTime = lastCheckinTimes[zone.id] ?? 0;
      if (now - lastTime < CHECKIN_COOLDOWN_MS) continue;

      lastCheckinTimes[zone.id] = now;
      await triggerCheckinPrompt(zone);
    }
  } catch (e: any) {
    console.warn('[CheckIn] Error:', e.message);
  }
}

async function triggerCheckinPrompt(zone: GeofenceZone): Promise<void> {
  await ExpoNotifications.scheduleNotificationAsync({
    content: {
      title: `${zone.icon} Llegaste a ${zone.name}`,
      body: '¿Quieres avisar a tu familia que llegaste bien? Toca para confirmar.',
      data: { type: 'checkin_prompt', zoneId: zone.id, zoneName: zone.name, zoneIcon: zone.icon },
      sound: 'default',
    },
    trigger: null, // inmediato
  });
}

/**
 * Envía el check-in al grupo — se llama cuando el usuario toca "Avisar que llegué".
 */
export async function confirmCheckin(
  groupId: string,
  zoneName: string,
  zoneIcon: string
): Promise<void> {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const { data: profile } = await sb
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const name = profile?.display_name ?? 'Alguien';

  // Insertar evento en tabla de check-ins
  await sb.from('checkins').insert({
    user_id: user.id,
    group_id: groupId,
    zone_name: zoneName,
    zone_icon: zoneIcon,
    checked_in_at: new Date().toISOString(),
  }).throwOnError();

  // Notificación local de confirmación
  await ExpoNotifications.scheduleNotificationAsync({
    content: {
      title: '✅ ¡Aviso enviado!',
      body: `Tu familia sabe que llegaste a ${zoneIcon} ${zoneName}`,
      data: { type: 'checkin_confirmed' },
      sound: 'default',
    },
    trigger: null,
  });
}
