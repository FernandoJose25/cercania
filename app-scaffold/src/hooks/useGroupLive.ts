// 📁 cercania/app-scaffold/src/hooks/useGroupLive.ts
/**
 * Hook que suscribe al grupo en tiempo real.
 *
 * - Carga el snapshot inicial con get_group_live().
 * - Suscribe a cambios en `locations` via Supabase Realtime.
 * - Cuando llega un update, lo aplica localmente sin recargar todo.
 * - También suscribe a `invisible_mode` y `sos_alerts`.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import { GroupLiveSnapshot, Location } from '../types/index';

interface UseGroupLiveResult {
  snapshot: GroupLiveSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGroupLive(groupId: string | null): UseGroupLiveResult {
  const [snapshot, setSnapshot] = useState<GroupLiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const memberIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const sb = await getSupabase();
      const { data, error: rpcError } = await sb.rpc('get_group_live', {
        p_group_id: groupId
      });
      if (rpcError) throw rpcError;
      if (!data) throw new Error('El grupo no existe o no tienes acceso');

      const snap = data as GroupLiveSnapshot;
      setSnapshot(snap);

      // Guardar IDs de miembros para filtrar updates de realtime
      memberIdsRef.current = new Set((snap.members ?? []).map(m => m.user_id));
    } catch (e: any) {
      setError(e.message ?? 'Error cargando el grupo');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;

    load();

    // Suscripción realtime
    const setupRealtime = async () => {
      const sb = await getSupabase();

      // Limpiar suscripción anterior
      if (channelRef.current) {
        await sb.removeChannel(channelRef.current);
      }

      const channel = sb
        .channel(`group-live-${groupId}`)

        // Cambios de ubicación
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'locations'
          },
          (payload) => {
            const updatedLocation = payload.new as Location;
            if (!memberIdsRef.current.has(updatedLocation.user_id)) return;

            setSnapshot(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                members: prev.members.map(m =>
                  m.user_id === updatedLocation.user_id
                    ? { ...m, location: updatedLocation }
                    : m
                )
              };
            });
          }
        )

        // Cambios de modo invisible
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'invisible_mode'
          },
          (payload) => {
            const userId =
              (payload.new as any)?.user_id ?? (payload.old as any)?.user_id;
            if (!userId || !memberIdsRef.current.has(userId)) return;

            const isInvisible = payload.eventType !== 'DELETE';
            setSnapshot(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                members: prev.members.map(m =>
                  m.user_id === userId
                    ? { ...m, is_invisible: isInvisible }
                    : m
                )
              };
            });
          }
        )

        // SOS activos
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sos_alerts'
          },
          () => {
            // Recargar completo para SOS (no es frecuente y necesita datos frescos)
            load();
          }
        )

        .subscribe();

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        getSupabase().then(sb => sb.removeChannel(channelRef.current!));
      }
    };
  }, [groupId, load]);

  return { snapshot, loading, error, refresh: load };
}
