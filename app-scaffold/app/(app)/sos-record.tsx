// 📁 cercania/app-scaffold/app/(app)/sos-record.tsx
// Graba 10 segundos de video automáticamente y activa el SOS
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Easing, StyleSheet, Text, View, Pressable
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { activateSOSWithVideo, cancelSOS } from '../../src/services/sos.service';

const COUNTDOWN = 3;
const RECORD_SECONDS = 10;

export default function SOSRecordScreen() {
  const { groupId, groupName } = useLocalSearchParams<{ groupId: string; groupName: string }>();
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();

  const [phase, setPhase] = useState<'countdown' | 'recording' | 'activating' | 'done'>('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN);
  const [recordProgress, setRecordProgress] = useState(0);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [cancellingSOS, setCancellingSOS] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const cancelledRef = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;

  // Pulso visual
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

  const requestPerms = useCallback(async () => {
    if (!camPerm?.granted) await requestCam();
    if (!micPerm?.granted) await requestMic();
  }, [camPerm, micPerm]);

  useEffect(() => { requestPerms(); }, []);

  // Cuenta regresiva
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('recording');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Grabación automática al entrar en fase 'recording'
  useEffect(() => {
    if (phase !== 'recording') return;
    if (!cameraRef.current) return;

    let progressInterval: ReturnType<typeof setInterval>;
    let started = false;

    const start = async () => {
      try {
        started = true;
        // Progreso visual
        let elapsed = 0;
        progressInterval = setInterval(() => {
          elapsed += 0.1;
          setRecordProgress(Math.min(elapsed / RECORD_SECONDS, 1));
          if (elapsed >= RECORD_SECONDS) clearInterval(progressInterval);
        }, 100);

        const video = await cameraRef.current!.recordAsync({ maxDuration: RECORD_SECONDS });

        clearInterval(progressInterval);

        if (cancelledRef.current || !video?.uri) {
          router.replace('/(app)/home');
          return;
        }

        // Fase: activando SOS (crea alerta + notifica push inmediatamente)
        setPhase('activating');
        const result = await activateSOSWithVideo(groupId!, video.uri, groupName ?? 'Tu familia');
        // Guardar alertId para que el botón "Estoy a salvo" pueda cancelar ya
        setAlertId(result.alert_id);
        setPhase('done');

        // Navegar a pantalla de SOS activo con el alertId para poder cancelarlo
        router.replace({
          pathname: '/(app)/sos-active',
          params: { groupId, groupName, alertId: result.alert_id }
        });
      } catch (e: any) {
        clearInterval(progressInterval);
        if (!cancelledRef.current) {
          Alert.alert('Error al activar SOS', e.message, [
            { text: 'Intentar sin video', onPress: () => activarSinVideo() },
            { text: 'Cancelar', style: 'cancel', onPress: () => router.replace('/(app)/home') }
          ]);
        }
      }
    };

    // Pequeño delay para que la cámara inicialice
    const t = setTimeout(start, 800);
    return () => {
      clearTimeout(t);
      if (started && cameraRef.current) {
        cameraRef.current.stopRecording();
      }
    };
  }, [phase]);

  const handleEstoyASalvo = async () => {
    if (!alertId || cancellingSOS) return;
    setCancellingSOS(true);
    try {
      await cancelSOS(alertId);
      router.replace('/(app)/home');
    } catch {
      // Si falla, igual navegar a home — la alerta se puede cancelar desde sos-active
      router.replace({
        pathname: '/(app)/sos-active',
        params: { groupId, groupName, alertId }
      });
    }
  };

  const activarSinVideo = async () => {
    try {
      const { activateSOS } = await import('../../src/services/sos.service');
      const result = await activateSOS(groupId!, '¡Necesito ayuda!');
      router.replace({
        pathname: '/(app)/sos-active',
        params: { groupId, groupName, alertId: result.alert_id }
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
      router.replace('/(app)/home');
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    if (phase === 'recording' && cameraRef.current) {
      cameraRef.current.stopRecording();
    }
    router.replace('/(app)/home');
  };

  if (!camPerm?.granted || !micPerm?.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>Se necesitan permisos de cámara y micrófono para el SOS.</Text>
        <Pressable style={styles.permBtn} onPress={requestPerms}>
          <Text style={styles.permBtnText}>Dar permisos</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/(app)/home')} style={{ marginTop: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Cámara trasera para capturar el entorno/amenaza */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="video"
      />

      {/* Overlay rojo */}
      <View style={styles.overlay}>
        {phase === 'countdown' && (
          <Animated.View style={[styles.countdownWrap, { transform: [{ scale: pulse }] }]}>
            <Text style={styles.countdownNum}>{countdown}</Text>
            <Text style={styles.countdownLabel}>Grabando en...</Text>
            <Text style={styles.countdownInfo}>Se grabará el entorno como evidencia</Text>
            <Pressable style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancelar SOS</Text>
            </Pressable>
          </Animated.View>
        )}

        {phase === 'recording' && (
          <View style={styles.recordingWrap}>
            <View style={styles.recDot} />
            <Text style={styles.recLabel}>Grabando evidencia...</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${recordProgress * 100}%` }]} />
            </View>
            <Text style={styles.recSub}>{Math.round(recordProgress * RECORD_SECONDS)}s / {RECORD_SECONDS}s</Text>
            <Text style={styles.recInfo}>Tu familia recibirá la alerta de inmediato</Text>
          </View>
        )}

        {phase === 'activating' && (
          <View style={styles.recordingWrap}>
            <Text style={styles.uploadIcon}>🆘</Text>
            <Text style={styles.recLabel}>Enviando reporte...</Text>
            <Text style={styles.recSub}>Notificando a tu familia ahora</Text>
            <Text style={styles.recInfo}>El video se sube en segundo plano</Text>
            {alertId && (
              <Pressable
                style={[styles.safeBtn, cancellingSOS && { opacity: 0.6 }]}
                onPress={handleEstoyASalvo}
                disabled={cancellingSOS}
              >
                <Text style={styles.safeBtnText}>
                  {cancellingSOS ? 'Cancelando...' : '✅ Estoy a salvo — Fue falsa alarma'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  centered: { flex: 1, backgroundColor: '#CC0000', alignItems: 'center', justifyContent: 'center', padding: 32 },
  permText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  permBtn: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  permBtnText: { color: '#CC0000', fontWeight: '800', fontSize: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  countdownWrap: { alignItems: 'center', gap: 12 },
  countdownNum: { fontSize: 120, fontWeight: '900', color: '#fff', lineHeight: 130 },
  countdownLabel: { fontSize: 20, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  countdownInfo: { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: -4 },
  cancelBtn: { marginTop: 24, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 50, paddingHorizontal: 32, paddingVertical: 14, borderWidth: 2, borderColor: '#fff' },
  cancelText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  recordingWrap: { alignItems: 'center', gap: 16, width: '80%' },
  recDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ff4444' },
  recLabel: { fontSize: 22, fontWeight: '800', color: '#fff' },
  recSub: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  recInfo: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  progressBar: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  uploadIcon: { fontSize: 48 },
  safeBtn: { marginTop: 12, backgroundColor: '#fff', borderRadius: 50, paddingHorizontal: 28, paddingVertical: 14, alignItems: 'center' },
  safeBtnText: { color: '#CC0000', fontWeight: '800', fontSize: 15 },
});
