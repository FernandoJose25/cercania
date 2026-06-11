// 📁 cercania/app-scaffold/src/components/sos/SOSAlertModal.tsx
// Modal que aparece cuando un miembro del grupo activa SOS
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Easing, Linking, Modal,
  Pressable, StyleSheet, Text, View
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { resolveSOS } from '../../services/sos.service';

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

export function SOSAlertModal({ visible, data, onDismiss }: Props) {
  const [resolving, setResolving] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(data.videoUrl ?? '', p => {
    p.loop = false;
  });

  useEffect(() => {
    if (!visible) return;
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.03, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    return () => pulse.stopAnimation();
  }, [visible]);

  const openMap = () => {
    const url = `https://maps.google.com/?q=${data.latitude},${data.longitude}`;
    Linking.openURL(url);
  };

  const handleResponding = async () => {
    Alert.alert(
      'Confirmar',
      `¿Estás yendo a ayudar a ${data.userName}?`,
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
            } finally {
              setResolving(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: pulse }] }]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🆘</Text>
            <Text style={styles.headerTitle}>ALERTA DE EMERGENCIA</Text>
            <Text style={styles.headerSub}>Activada por {data.userName}</Text>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoRow}>👤 <Text style={styles.infoBold}>{data.userName}</Text> necesita ayuda</Text>
            <Text style={styles.infoRow}>👥 Grupo: <Text style={styles.infoBold}>{data.groupName}</Text></Text>
            <Text style={styles.infoRow}>📍 <Text style={styles.infoBold}>{data.latitude.toFixed(5)}, {data.longitude.toFixed(5)}</Text></Text>
          </View>

          {/* Video */}
          {data.videoUrl && (
            <View style={styles.videoSection}>
              {!showVideo ? (
                <Pressable style={styles.videoBtn} onPress={() => setShowVideo(true)}>
                  <Text style={styles.videoBtnIcon}>▶️</Text>
                  <Text style={styles.videoBtnText}>Ver video de emergencia</Text>
                </Pressable>
              ) : (
                <View style={styles.videoWrap}>
                  <VideoView
                    player={player}
                    style={styles.video}
                    allowsFullscreen
                    allowsPictureInPicture={false}
                  />
                </View>
              )}
            </View>
          )}

          {/* Acciones */}
          <Pressable style={styles.mapBtn} onPress={openMap}>
            <Text style={styles.mapBtnText}>📍 Ver ubicación en Google Maps</Text>
          </Pressable>

          <Pressable
            style={[styles.respondBtn, resolving && styles.respondBtnDisabled]}
            onPress={handleResponding}
            disabled={resolving}
          >
            <Text style={styles.respondBtnText}>
              {resolving ? 'Registrando...' : '🚗 Estoy yendo a ayudar'}
            </Text>
          </Pressable>

          <Pressable style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>Cerrar (ya estoy al tanto)</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#CC0000',
  },
  header: {
    backgroundColor: '#CC0000',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 4,
  },
  headerIcon: { fontSize: 44 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  infoBox: {
    backgroundColor: '#FFF5F5',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  infoRow: { fontSize: 14, color: '#374151' },
  infoBold: { fontWeight: '700', color: '#111827' },
  videoSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  videoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1F2937', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    justifyContent: 'center',
  },
  videoBtnIcon: { fontSize: 20 },
  videoBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  videoWrap: { borderRadius: 12, overflow: 'hidden', aspectRatio: 9 / 16, width: '100%' },
  video: { flex: 1 },
  mapBtn: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  mapBtnText: { color: '#1D4ED8', fontWeight: '700', fontSize: 14 },
  respondBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#CC0000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  respondBtnDisabled: { opacity: 0.6 },
  respondBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  dismissBtn: { alignItems: 'center', paddingVertical: 14, paddingBottom: 18 },
  dismissText: { color: '#9CA3AF', fontSize: 13 },
});
