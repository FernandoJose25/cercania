// 📁 cercania/app-scaffold/src/hooks/useSOSAlert.ts
// Escucha alertas SOS activas en los grupos del usuario via Realtime
import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../store/auth';
import { SOSAlertData } from '../components/sos/SOSAlertModal';

export function useSOSAlert() {
  const { user } = useAuth();
  const [activeAlert, setActiveAlert] = useState<SOSAlertData | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let channel: any;

    const setup = async () => {
      const sb = await getSupabase();

      // Obtener grupos del usuario
      const { data: memberships } = await sb
        .from('group_members')
        .select('group_id, groups(name)')
        .eq('user_id', user.id);

      if (!memberships || memberships.length === 0) return;

      const groupIds = memberships.map((m: any) => m.group_id);

      // Suscribirse a nuevas alertas SOS en los grupos del usuario
      channel = sb
        .channel('sos_alerts_watch')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'sos_alerts',
          // No podemos filtrar por array con filter= en Realtime, filtramos en el handler
        }, async (payload) => {
          const alert = payload.new as any;

          // Ignorar alertas propias
          if (alert.user_id === user.id) return;

          // Verificar que sea de un grupo del usuario
          if (!groupIds.includes(alert.group_id)) return;

          // Obtener nombre del miembro y del grupo
          const [profileRes, groupRes] = await Promise.all([
            sb.from('profiles').select('display_name').eq('id', alert.user_id).single(),
            sb.from('groups').select('name').eq('id', alert.group_id).single(),
          ]);

          setActiveAlert({
            alertId: alert.id,
            userName: profileRes.data?.display_name ?? 'Un familiar',
            groupId: alert.group_id,
            groupName: groupRes.data?.name ?? 'Tu grupo',
            latitude: alert.latitude,
            longitude: alert.longitude,
            videoUrl: alert.video_url ?? null,
          });
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'sos_alerts',
        }, (payload) => {
          const alert = payload.new as any;
          // Si la alerta activa fue resuelta/cancelada, cerrar el modal
          if (activeAlert?.alertId === alert.id && alert.status !== 'active') {
            setActiveAlert(null);
          }
        })
        .subscribe();
    };

    setup();
    return () => { channel?.unsubscribe(); };
  }, [user?.id]);

  return { activeAlert, clearAlert: () => setActiveAlert(null) };
}
