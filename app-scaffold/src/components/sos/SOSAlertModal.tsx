// Modal que aparece cuando un miembro del grupo activa SOS
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Easing, Linking, Modal,
  Pressable, ScrollView, StyleSheet, Text, View
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { resolveSOS } from '../../services/sos.service';
import { notifyChatMessage } from '../../services/notifications.service';
import { getSupabase } from '../../lib/supabase';
import { useAuth } from '../../store/auth';

export interface SOSAlertData {
  alertId: string;
  userName: string;
  groupId: string;
  groupName: string;
  latitude: number;
  longitude: number;
  videoUrl: string | null;
}

interface Props {
  visible: boolean;
  data: SOSAlertData;
  onDismiss: () => void;
}

const QUICK_MESSAGES = [
  { label: 'Ya vi la alerta, estoy al tanto', icon: 'eye-outline' as const },
  { label: 'Voy en camino a ayudarte', icon: 'car-outline' as const },
  { label: '¿Estás bien? Respóndeme', icon: 'chatbubble-outline' as const },
  { label: 'Llamaré a servicios de emergencia', icon: 'call-outline' as const },
  { label: 'Ya estás a salvo, cancela el SOS', icon: 'shield-checkmark-outline' as const },
];

export function SOSAlertModal({ visible, data, onDismiss }: Props) {
  const { profile } = useAuth();
  const [resolving, setResolving] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [sendingMsg, setSendingMsg] = useState<number | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [visible]);

  const openMap = () => {
    Linking.openURL(`https://maps.google.com/?q=${data.latitude},${data.longitude}`);
  };

  const sendQuickMessage = async (idx: number, text: string) => {
    setSendingMsg(idx);
    try {
      const sb = await getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;

      await sb.from('messages').insert({
        group_id: data.groupId,
        user_id: user.id,
        content: `🆘 ${text}`,
        type: 'text',
      });

      const senderName = profile?.display_name ?? 'Un familiar';
      await notifyChatMessage(data.groupId, senderName, user.id, `🆘 ${text}`);
    } catch {
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    } finally {
      setSendingMsg(null);
    }
  };

  const handleResponding = async () => {
    Alert.alert(
      'Confirmar',
      `¿Confirmas que vas a ayudar a ${data.userName}? Esto resolverá la alerta.`,
      [
        { text: 'Aún no', style: 'cancel' },
        {
          text: 'Sí, voy en camino',
          onPress: async () => {
            setResolving(true);
            try {
              await resolveSOS(data.alertId);
              onDismiss();
            } catch (e: any) {
              Alert.alert('Error', e.message);
              setResolving(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <Animated.View style={[s.card, { transform: [{ scale: pulse }] }]}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerIcon}>🆘</Text>
            <Text style={s.headerTitle}>EMERGENCIA SOS</Text>
            <Text style={s.headerSub}>{data.userName} necesita ayuda ahora mismo</Text>
          </View>

          <ScrollView style={s.body} showsVerticalScrollIndicator={false}>

            {/* Info */}
            <View style={s.infoCard}>
              <View style={s.infoRow}>
                <View style={s.infoIcon}><Ionicons name="person" size={16} color="#F59E0B" /></View>
                <Text style={s.infoText}><Text style={s.infoBold}>{data.userName}</Text> — {data.groupName}</Text>
              </View>
              <View style={s.infoRow}>
                <View style={s.infoIcon}><Ionicons name="location" size={16} color="#EF4444" /></View>
                <Text style={s.infoText}>{data.latitude.toFixed(5)}, {data.longitude.toFixed(5)}</Text>
              </View>
            </View>

            {/* Ver en mapa */}
            <Pressable style={s.mapBtn} onPress={openMap}>
              <Ionicons name="map" size={18} color="#fff" />
              <Text style={s.mapBtnText}>Ver ubicación en Google Maps</Text>
            </Pressable>

            {/* Video de evidencia */}
            {data.videoUrl && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>EVIDENCIA</Text>
                {!showVideo ? (
                  <Pressable style={s.videoBtn} onPress={() => setShowVideo(true)}>
                    <Ionicons name="play-circle" size={28} color="#F59E0B" />
                    <Text style={s.videoBtnText}>Ver video de emergencia</Text>
                  </Pressable>
                ) : (
                  <View style={s.videoWrap}>
                    <Video
                      source={{ uri: data.videoUrl! }}
                      style={s.video}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay
                    />
                  </View>
                )}
              </View>
            )}

            {/* Mensajes rápidos */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>ENVIAR MENSAJE RÁPIDO AL GRUPO</Text>
              {QUICK_MESSAGES.map((msg, idx) => (
                <Pressable
                  key={idx}
                  style={[s.quickMsg, sendingMsg === idx && s.quickMsgSending]}
                  onPress={() => sendQuickMessage(idx, msg.label)}
                  disabled={sendingMsg !== null}
                >
                  <Ionicons name={msg.icon} size={18} color={sendingMsg === idx ? '#78716C' : '#F59E0B'} />
                  <Text style={[s.quickMsgText, sendingMsg === idx && { color: '#78716C' }]}>
                    {sendingMsg === idx ? 'Enviando...' : msg.label}
                  </Text>
                  {sendingMsg !== idx && <Ionicons name="send" size={14} color="#57534E" />}
                </Pressable>
              ))}
            </View>

            {/* Acciones */}
            <View style={s.section}>
              <Pressable
                style={[s.respondBtn, resolving && s.respondBtnDisabled]}
                onPress={handleResponding}
                disabled={resolving}
              >
                <Ionicons name="car" size={20} color="#fff" />
                <Text style={s.respondBtnText}>
                  {resolving ? 'Registrando...' : 'Voy en camino — Marcar como atendido'}
                </Text>
              </Pressable>

              <Pressable style={s.dismissBtn} onPress={onDismiss}>
                <Text style={s.dismissText}>Cerrar — ya estoy al tanto</Text>
              </Pressable>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#0C0A09',
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  header: {
    backgroundColor: '#7F1D1D',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#991B1B',
  },
  headerIcon: { fontSize: 44 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FECACA', letterSpacing: 1.5 },
  headerSub: { fontSize: 13, color: 'rgba(254,202,202,0.75)', fontWeight: '600', textAlign: 'center' },

  body: { flex: 1 },

  infoCard: {
    margin: 16,
    backgroundColor: '#1C1917',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#292524',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#292524',
    alignItems: 'center', justifyContent: 'center',
  },
  infoText: { fontSize: 13, color: '#A8A29E', flex: 1 },
  infoBold: { fontWeight: '700', color: '#E7E5E4' },

  mapBtn: {
    marginHorizontal: 16,
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
    color: '#78716C', marginBottom: 10,
  },

  videoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1C1917', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 1, borderColor: '#F59E0B44',
  },
  videoBtnText: { color: '#F59E0B', fontWeight: '700', fontSize: 14 },
  videoWrap: { borderRadius: 12, overflow: 'hidden', aspectRatio: 9 / 16, width: '100%' },
  video: { flex: 1 },

  quickMsg: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1C1917', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1, borderColor: '#292524',
  },
  quickMsgSending: { opacity: 0.5 },
  quickMsgText: { flex: 1, color: '#D6D3D1', fontSize: 13, fontWeight: '500' },

  respondBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  respondBtnDisabled: { opacity: 0.5 },
  respondBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  dismissBtn: { alignItems: 'center', paddingVertical: 12 },
  dismissText: { color: '#78716C', fontSize: 13 },
});
