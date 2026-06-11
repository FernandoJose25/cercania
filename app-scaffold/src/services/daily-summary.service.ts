// 📁 cercania/app-scaffold/src/services/daily-summary.service.ts
/**
 * Resumen diario nocturno — notificación a las 9 PM con el estado del día.
 * "Hoy todos llegaron bien a sus destinos ✅"
 */
import * as ExpoNotifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { getSupabase } from '../lib/supabase';

const LAST_SUMMARY_KEY = 'cercania_last_daily_summary';

export async function scheduleDailySummary(): Promise<void> {
  // Cancelar cualquier resumen anterior programado
  const existing = await ExpoNotifications.getAllScheduledNotificationsAsync();
  for (const n of existing) {
    if (n.content.data?.type === 'daily_summary') {
      await ExpoNotifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  // Programar para las 9 PM hora local todos los días
  await ExpoNotifications.scheduleNotificationAsync({
    content: {
      title: '📊 Resumen del día — Cercanía',
      body: 'Toca para ver cómo estuvo tu familia hoy',
      data: { type: 'daily_summary' },
      sound: 'default',
    },
    trigger: {
      type: ExpoNotifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}

export async function cancelDailySummary(): Promise<void> {
  const existing = await ExpoNotifications.getAllScheduledNotificationsAsync();
  for (const n of existing) {
    if (n.content.data?.type === 'daily_summary') {
      await ExpoNotifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export interface DailySummaryData {
  date: string;
  allSafe: boolean;
  memberSummaries: Array<{
    name: string;
    emoji: string;
    zonesVisited: string[];
    lastSeen: string | null;
  }>;
  sosTriggers: number;
}

export async function buildDailySummary(groupId: string): Promise<DailySummaryData> {
  const sb = await getSupabase();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const { data: snapshot } = await sb.rpc('get_group_live', { p_group_id: groupId });

  const memberSummaries = (snapshot?.members ?? []).map((m: any) => ({
    name: m.profile?.display_name ?? 'Miembro',
    emoji: '👤',
    zonesVisited: [],
    lastSeen: m.location?.updated_at ?? null,
  }));

  // Contar SOS del día
  const { count: sosTriggers } = await sb
    .from('sos_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .gte('triggered_at', startOfDay);

  const allSafe = (sosTriggers ?? 0) === 0;

  return {
    date: today.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }),
    allSafe,
    memberSummaries,
    sosTriggers: sosTriggers ?? 0,
  };
}
