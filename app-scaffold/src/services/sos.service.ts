// 📁 cercania/app-scaffold/src/services/sos.service.ts
import { getSupabase } from '../lib/supabase';
import { getCurrentLocation } from './tracking.service';
import { notifySOSAlert } from './notifications.service';
import * as Haptics from 'expo-haptics';

export interface SOSAlert {
    id: string;
    user_id: string;
    group_id: string;
    latitude: number;
    longitude: number;
    message: string | null;
    status: 'active' | 'false_alarm' | 'resolved';
    created_at: string;
    resolved_at: string | null;
    resolved_by: string | null;
}

export async function activateSOS(
    groupId: string,
    message?: string
): Promise<{ alert_id: string }> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    const location = await getCurrentLocation();
    if (!location) throw new Error('No se pudo obtener tu ubicación');

    const sb = await getSupabase();

    // Obtener nombre del usuario
    const { data: { user } } = await sb.auth.getUser();
    const { data: profile } = await sb
        .from('profiles')
        .select('display_name')
        .eq('id', user?.id)
        .single();

    const { data, error } = await sb.rpc('create_sos_alert', {
        p_group_id: groupId,
        p_lat: location.coords.latitude,
        p_lng: location.coords.longitude,
        p_message: message ?? '¡Necesito ayuda!'
    });

    if (error) throw error;

    // Enviar notificación push a todos los miembros del grupo
    const userName = profile?.display_name?.split(' ')[0] ?? 'Un familiar';
    await notifySOSAlert(groupId, userName, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
    }).catch(console.warn);

    return data as { alert_id: string };
}

export async function cancelSOS(alertId: string): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const sb = await getSupabase();
    const { error } = await sb.rpc('cancel_sos_alert', { p_alert_id: alertId });
    if (error) throw error;
}

export async function resolveSOS(alertId: string): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.rpc('resolve_sos_alert', { p_alert_id: alertId });
    if (error) throw error;
}

export async function getActiveSOSAlerts(): Promise<SOSAlert[]> {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('sos_alerts')
        .select('*')
        .is('resolved_at', null)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as SOSAlert[];
}