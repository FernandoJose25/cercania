// 📁 cercania/app-scaffold/src/services/gathering.service.ts
/**
 * Detecta cuando todos los miembros del grupo se encuentran juntos (en un radio de 200m)
 * y envía una notificación festiva al grupo.
 */
import * as ExpoNotifications from 'expo-notifications';
import { getSupabase } from '../lib/supabase';
import { haversineMeters } from '../utils/geo';

const GATHERING_RADIUS_M = 200;
const GATHERING_COOLDOWN_MS = 2 * 60 * 60 * 1000; // máximo 1 aviso cada 2 horas

const lastGatheringNotif: Record<string, number> = {};

export async function checkGroupGathering(groupId: string): Promise<void> {
  try {
    const now = Date.now();
    const lastTime = lastGatheringNotif[groupId] ?? 0;
    if (now - lastTime < GATHERING_COOLDOWN_MS) return;

    const sb = await getSupabase();
    const { data: snapshot } = await sb.rpc('get_group_live', { p_group_id: groupId });
    if (!snapshot) return;

    const members = snapshot.members ?? [];
    // Solo verificar si hay al menos 2 miembros y todos tienen ubicación reciente
    if (members.length < 2) return;

    const withLocation = members.filter((m: any) => {
      if (!m.location || m.is_invisible) return false;
      const ageMs = now - new Date(m.location.updated_at).getTime();
      return ageMs < 15 * 60 * 1000; // ubicación de hace menos de 15 min
    });

    if (withLocation.length < members.length) return;

    // Verificar que todos están dentro del radio entre sí
    const lats = withLocation.map((m: any) => m.location.latitude);
    const lngs = withLocation.map((m: any) => m.location.longitude);
    const centerLat = lats.reduce((a: number, b: number) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length;

    const allClose = withLocation.every((m: any) =>
      haversineMeters(m.location.latitude, m.location.longitude, centerLat, centerLng) <= GATHERING_RADIUS_M
    );

    if (!allClose) return;

    lastGatheringNotif[groupId] = now;

    const groupName = snapshot.group?.name ?? 'tu grupo';
    await ExpoNotifications.scheduleNotificationAsync({
      content: {
        title: `🎉 ¡Todos reunidos!`,
        body: `Todo ${groupName} está junto ahora mismo`,
        data: { type: 'gathering', groupId },
        sound: 'default',
      },
      trigger: null,
    });
  } catch (e: any) {
    console.warn('[Gathering]', e.message);
  }
}
