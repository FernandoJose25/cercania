// 📁 cercania/app-scaffold/src/services/sos.service.ts
import { getSupabase } from '../lib/supabase';
import { getCurrentLocation } from './tracking.service';
import { notifySOSAlert } from './notifications.service';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';

export interface SOSAlert {
    id: string;
    user_id: string;
    group_id: string;
    latitude: number;
    longitude: number;
    message: string | null;
    video_url: string | null;
    status: 'active' | 'false_alarm' | 'resolved' | 'cancelled';
    created_at: string;
    resolved_at: string | null;
    resolved_by: string | null;
}

async function uploadSOSVideo(videoUri: string, userId: string): Promise<string | null> {
    try {
        const sb = await getSupabase();
        const fileName = `sos_${userId}_${Date.now()}.mp4`;
        const path = `sos-videos/${fileName}`;

        const base64 = await FileSystem.readAsStringAsync(videoUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

        const { error } = await sb.storage
            .from('sos-evidence')
            .upload(path, byteArray, {
                contentType: 'video/mp4',
                upsert: false,
            });

        if (error) {
            console.warn('[SOS] Error subiendo video:', error.message);
            return null;
        }

        const { data: urlData } = sb.storage.from('sos-evidence').getPublicUrl(path);
        return urlData.publicUrl;
    } catch (e: any) {
        console.warn('[SOS] Error en upload:', e.message);
        return null;
    }
}

export async function activateSOSWithVideo(
    groupId: string,
    videoUri: string,
    groupName: string
): Promise<{ alert_id: string }> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    const location = await getCurrentLocation();
    if (!location) throw new Error('No se pudo obtener tu ubicación');

    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('No hay sesión activa');

    const { data: profile } = await sb
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

    // Subir video en paralelo con la creación de la alerta
    const [videoUrl, alertResult] = await Promise.all([
        uploadSOSVideo(videoUri, user.id),
        sb.rpc('create_sos_alert', {
            p_group_id: groupId,
            p_lat: location.coords.latitude,
            p_lng: location.coords.longitude,
            p_message: '¡Necesito ayuda!'
        })
    ]);

    if (alertResult.error) throw alertResult.error;

    const alertId = (alertResult.data as { alert_id: string }).alert_id;

    // Si tenemos video, actualizar la alerta con la URL
    if (videoUrl && alertId) {
        await sb.from('sos_alerts')
            .update({ video_url: videoUrl })
            .eq('id', alertId);
    }

    // Notificar al grupo con la info del video
    const userName = profile?.display_name?.split(' ')[0] ?? 'Un familiar';
    await notifySOSAlert(groupId, userName, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
    }, alertId, videoUrl).catch(console.warn);

    return { alert_id: alertId };
}

// Mantener compatibilidad con el flujo sin video
export async function activateSOS(
    groupId: string,
    message?: string
): Promise<{ alert_id: string }> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    const location = await getCurrentLocation();
    if (!location) throw new Error('No se pudo obtener tu ubicación');

    const sb = await getSupabase();
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

    const alertId = (data as { alert_id: string }).alert_id;
    const userName = profile?.display_name?.split(' ')[0] ?? 'Un familiar';
    await notifySOSAlert(groupId, userName, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
    }, alertId, null).catch(console.warn);

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

export async function getActiveSOSAlerts(groupId: string): Promise<SOSAlert[]> {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('sos_alerts')
        .select('*')
        .eq('group_id', groupId)
        .is('resolved_at', null)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as SOSAlert[];
}
