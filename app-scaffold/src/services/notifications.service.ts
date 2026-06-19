// 📁 cercania/app-scaffold/src/services/notifications.service.ts
/**
 * Servicio de notificaciones push.
 *
 * Usa Expo Push Notifications — gratis, sin configurar FCM/APNs manualmente.
 * Sonido suave configurado para no asustar al usuario.
 *
 * Tipos de notificación:
 * - SOS: alerta de emergencia de un miembro
 * - Contacto de confianza: solicitud pendiente
 * - Recuperación: alguien necesita tu aprobación
 * - Batería baja: un familiar tiene menos del 15%
 */

import * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getSupabase } from '../lib/supabase';

// Configuración global de notificaciones
// sound: 'default' usa el sonido del sistema pero más suave que las alertas
ExpoNotifications.setNotificationHandler({
    handleNotification: async (notification) => {
        const isSOS = notification.request.content.data?.type === 'sos';
        return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            // SOS usa sonido más prominente, el resto suave
            priority: isSOS
                ? ExpoNotifications.AndroidNotificationPriority.MAX
                : ExpoNotifications.AndroidNotificationPriority.DEFAULT
        };
    }
});

export interface PushPayload {
    to: string[];
    title: string;
    body: string;
    data?: Record<string, any>;
    sound?: 'default' | null;
    priority?: 'default' | 'normal' | 'high';
    badge?: number;
    channelId?: string;
}

/**
 * Solicita permisos de notificación y guarda el token en Supabase.
 */
export async function registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
        console.warn('[Push] Solo funciona en dispositivo físico');
        return null;
    }

    const { status: existing } = await ExpoNotifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
        const { status } = await ExpoNotifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('[Push] Permisos de notificación denegados');
        return null;
    }

    // Canal Android con sonido suave
    if (Platform.OS === 'android') {
        await ExpoNotifications.setNotificationChannelAsync('default', {
            name: 'Cercanía',
            importance: ExpoNotifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#F59E0B',
            sound: 'default',
            enableVibrate: true,
            showBadge: true
        });

        await ExpoNotifications.setNotificationChannelAsync('sos', {
            name: 'Alertas SOS',
            importance: ExpoNotifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 200, 500, 200, 500],
            lightColor: '#EF4444',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
            bypassDnd: true // Las SOS ignoran el modo No Molestar
        });
    }

    try {
        const tokenData = await ExpoNotifications.getExpoPushTokenAsync({
            projectId: '60d6a0df-e52a-401a-8e04-8027d04a6221'
        });

        const token = tokenData.data;

        // Guardar token en Supabase
        const sb = await getSupabase();
        await sb.rpc('save_push_token', {
            p_token: token,
            p_platform: Platform.OS
        });

        return token;
    } catch (e: any) {
        console.warn('[Push] Error obteniendo token:', e.message);
        return null;
    }
}

/**
 * Envía notificaciones push via Expo Push API.
 * Puede enviar a múltiples dispositivos a la vez.
 */
export async function sendPushNotifications(payload: PushPayload): Promise<void> {
    if (!payload.to || payload.to.length === 0) return;

    // Tokens de Expo pueden empezar con ExponentPushToken[ o ExpoPushToken[
    const validTokens = payload.to.filter(t =>
        t?.startsWith('ExponentPushToken[') || t?.startsWith('ExpoPushToken[')
    );
    if (validTokens.length === 0) {
        console.warn('[Push] Sin tokens válidos de Expo en la lista:', payload.to.length, 'tokens recibidos');
        return;
    }

    // Dividir en chunks de 100 (límite de Expo)
    const chunks = [];
    for (let i = 0; i < validTokens.length; i += 100) {
        chunks.push(validTokens.slice(i, i + 100));
    }

    for (const chunk of chunks) {
        const messages = chunk.map(token => ({
            to: token,
            title: payload.title,
            body: payload.body,
            data: payload.data ?? {},
            sound: payload.sound ?? 'default',
            priority: payload.priority ?? 'normal',
            badge: payload.badge ?? 1,
            channelId: payload.channelId ?? 'default'
        }));

        try {
            const res = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messages)
            });
            if (!res.ok) {
                const body = await res.text().catch(() => '');
                console.warn('[Push] HTTP', res.status, body);
            }
        } catch (e: any) {
            console.warn('[Push] Error enviando:', e.message);
        }
    }
}

/**
 * Obtiene tokens de push de los miembros de un grupo (excluyendo al usuario actual).
 * Intenta primero con el RPC y si falla hace query directa.
 */
async function getGroupTokens(groupId: string): Promise<string[]> {
    const sb = await getSupabase();

    // RPC SECURITY DEFINER — bypasea RLS, devuelve JSON array o null si no hay tokens
    const { data: rpcResult, error: rpcError } = await sb.rpc('get_group_push_tokens', { p_group_id: groupId });
    if (rpcError) {
        console.warn('[Push] RPC get_group_push_tokens falló:', rpcError.message);
        return [];
    }

    // La RPC devuelve json_agg(...) que puede ser null si no hay filas
    if (!rpcResult) return [];

    const tokens: string[] = Array.isArray(rpcResult) ? rpcResult : Object.values(rpcResult);
    return tokens.filter((t): t is string => typeof t === 'string' && (
        t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')
    ));
}

/**
 * Notifica a todos los miembros del grupo sobre una alerta SOS.
 */
export async function notifySOSAlert(
    groupId: string,
    userName: string,
    location: { latitude: number; longitude: number },
    alertId?: string,
    videoUrl?: string | null
): Promise<void> {
    const tokens = await getGroupTokens(groupId);
    if (tokens.length === 0) {
        console.warn('[Push] SOS: sin tokens de destinatarios para grupo', groupId);
        return;
    }

    await sendPushNotifications({
        to: tokens,
        title: '🆘 ALERTA DE EMERGENCIA',
        body: `${userName} necesita ayuda ahora mismo. Toca para ver su ubicación${videoUrl ? ' y el video.' : '.'}`,
        data: {
            type: 'sos',
            groupId,
            alertId: alertId ?? null,
            videoUrl: videoUrl ?? null,
            userName,
            latitude: location.latitude,
            longitude: location.longitude
        },
        sound: 'default',
        priority: 'high',
        channelId: 'sos'
    });
}

/**
 * Notifica a los contactos de confianza sobre una solicitud de recuperación.
 */
export async function notifyRecoveryRequest(
    targetUserId: string,
    userName: string
): Promise<void> {
    const sb = await getSupabase();
    const { data: rpcTokens, error: rpcError } = await sb.rpc('get_trusted_contact_tokens', {
        p_user_id: targetUserId
    });

    let tokens: string[] = [];
    if (!rpcError && Array.isArray(rpcTokens) && rpcTokens.length > 0) {
        tokens = rpcTokens as string[];
    } else {
        // Fallback: query directa
        if (rpcError) console.warn('[Push] RPC get_trusted_contact_tokens falló:', rpcError.message);
        const { data: contacts } = await sb
            .from('trusted_contacts')
            .select('contact_id')
            .eq('user_id', targetUserId)
            .eq('status', 'accepted');
        if (contacts?.length) {
            const { data: tokenRows } = await sb
                .from('push_tokens')
                .select('token')
                .in('user_id', contacts.map(c => c.contact_id));
            tokens = (tokenRows ?? []).map((r: any) => r.token).filter(Boolean);
        }
    }
    if (tokens.length === 0) return;

    await sendPushNotifications({
        to: tokens,
        title: '🔐 Solicitud de recuperación',
        body: `${userName} perdió acceso a su cuenta y necesita tu ayuda para recuperarla.`,
        data: { type: 'recovery', userId: targetUserId },
        priority: 'normal',
        channelId: 'default'
    });
}

/**
 * Notifica a un usuario que fue invitado como contacto de confianza.
 */
export async function notifyTrustedContactInvite(
    contactUserId: string,
    requesterName: string
): Promise<void> {
    const sb = await getSupabase();
    const { data: tokens } = await sb
        .from('push_tokens')
        .select('token')
        .eq('user_id', contactUserId);

    if (!tokens || tokens.length === 0) return;

    await sendPushNotifications({
        to: tokens.map((t: any) => t.token),
        title: '🛡️ Solicitud de confianza',
        body: `${requesterName} quiere que seas su contacto de confianza en Cercanía.`,
        data: { type: 'trusted_contact_invite' },
        priority: 'normal',
        channelId: 'default'
    });
}

/**
 * Notifica batería baja de un familiar.
 */
export async function notifyLowBattery(
    groupId: string,
    memberName: string,
    batteryLevel: number
): Promise<void> {
    const tokens = await getGroupTokens(groupId);
    if (tokens.length === 0) return;

    await sendPushNotifications({
        to: tokens,
        title: `⚠️ Batería baja — ${memberName}`,
        body: `${memberName} tiene solo ${batteryLevel}% de batería. Puede que pronto no puedas verle.`,
        data: { type: 'low_battery', groupId, memberName },
        priority: 'normal',
        channelId: 'default'
    });
}

/**
 * Notifica a los miembros del grupo cuando alguien envía un mensaje en el chat.
 * Usa getGroupTokens (RPC SECURITY DEFINER) para evitar el bloqueo de RLS en push_tokens.
 */
export async function notifyChatMessage(
    groupId: string,
    senderName: string,
    senderId: string,
    message: string
): Promise<void> {
    // getGroupTokens usa get_group_push_tokens RPC (SECURITY DEFINER) que sí puede leer
    // tokens de otros usuarios del grupo, bypasseando el RLS de push_tokens.
    const tokens = await getGroupTokens(groupId);
    if (!tokens.length) {
        console.warn('[Push] Chat: sin tokens para grupo', groupId);
        return;
    }

    const preview = message.length > 60 ? message.slice(0, 57) + '...' : message;

    await sendPushNotifications({
        to: tokens,
        title: `💬 ${senderName}`,
        body: preview,
        data: { type: 'chat', groupId, senderId },
        priority: 'normal',
        channelId: 'default',
    });
}

/**
 * Configura los listeners de notificaciones (llamar en el layout raíz).
 */
export function setupNotificationListeners(
    onNotification: (notification: ExpoNotifications.Notification) => void,
    onResponse: (response: ExpoNotifications.NotificationResponse) => void
) {
    const notificationListener = ExpoNotifications.addNotificationReceivedListener(onNotification);
    const responseListener = ExpoNotifications.addNotificationResponseReceivedListener(onResponse);

    return () => {
        ExpoNotifications.removeNotificationSubscription(notificationListener);
        ExpoNotifications.removeNotificationSubscription(responseListener);
    };
}