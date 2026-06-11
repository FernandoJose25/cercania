// 📁 cercania/app-scaffold/src/services/frequent-places.service.ts
/**
 * Detecta lugares frecuentes analizando el historial de ubicaciones.
 * Un "lugar frecuente" es una coordenada donde el usuario ha estado
 * al menos 3 veces durante ≥10 minutos, agrupadas por radio de 100m.
 */
import { getSupabase } from '../lib/supabase';
import { haversineMeters } from '../utils/geo';

export interface FrequentPlace {
  id: string;
  name: string;
  suggestedIcon: string;
  latitude: number;
  longitude: number;
  visitCount: number;
  lastVisit: string;
  alreadySaved: boolean; // ya tiene geofence creado
}

const TIME_SLOTS: Record<string, { label: string; icon: string }> = {
  morning_weekday: { label: 'Trabajo / Estudio', icon: '💼' },
  evening_home: { label: 'Casa', icon: '🏠' },
  weekend_afternoon: { label: 'Lugar de ocio', icon: '🌳' },
};

export async function detectFrequentPlaces(): Promise<FrequentPlace[]> {
  try {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];

    // Leer historial de los últimos 30 días
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: history } = await sb
      .from('location_history')
      .select('latitude, longitude, recorded_at')
      .eq('user_id', user.id)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false })
      .limit(2000);

    if (!history?.length) return [];

    // Leer geofences existentes para marcar cuáles ya están guardados
    const { data: existingZones } = await sb
      .from('geofences')
      .select('latitude, longitude')
      .eq('user_id', user.id);

    // Agrupar en clusters de 100m
    const clusters: Array<{
      lat: number; lon: number; count: number; lastVisit: string
    }> = [];

    for (const point of history) {
      const existing = clusters.find(c =>
        haversineMeters(c.lat, c.lon, point.latitude, point.longitude) < 100
      );
      if (existing) {
        existing.count++;
        if (point.recorded_at > existing.lastVisit) existing.lastVisit = point.recorded_at;
      } else {
        clusters.push({ lat: point.latitude, lon: point.longitude, count: 1, lastVisit: point.recorded_at });
      }
    }

    // Filtrar clusters con al menos 3 visitas
    const frequent = clusters
      .filter(c => c.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return frequent.map((c, i) => {
      const alreadySaved = !!(existingZones?.some(z =>
        haversineMeters(z.latitude, z.longitude, c.lat, c.lon) < 200
      ));
      // Heurística de ícono por hora del día más frecuente
      const hour = new Date(c.lastVisit).getHours();
      let suggestedIcon = '📍';
      let name = `Lugar frecuente ${i + 1}`;
      if (hour >= 8 && hour <= 10) { suggestedIcon = '💼'; name = 'Trabajo / Estudio'; }
      else if (hour >= 20 || hour <= 7) { suggestedIcon = '🏠'; name = 'Casa'; }
      else if (hour >= 12 && hour <= 14) { suggestedIcon = '🍽️'; name = 'Almuerzo'; }

      return {
        id: `frequent_${i}`,
        name,
        suggestedIcon,
        latitude: c.lat,
        longitude: c.lon,
        visitCount: c.count,
        lastVisit: c.lastVisit,
        alreadySaved,
      };
    });
  } catch (e: any) {
    console.warn('[FrequentPlaces]', e.message);
    return [];
  }
}
