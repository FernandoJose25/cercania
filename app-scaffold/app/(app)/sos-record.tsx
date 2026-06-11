// 📁 cercania/app-scaffold/app/(app)/sos-record.tsx
// Graba 10 segundos de video automáticamente y activa el SOS
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Easing, StyleSheet, Text, View, Pressable
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { activateSOSWithVideo } from '../../src/services/sos.service';

const COUNTDOWN = 3;
const RECORD_SECONDS = 10;

export default function SOSRecordScreen() {
  const { groupId, groupName } = useLocalSearchParams<{ groupId: string; groupName: string }>();
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();

  const [phase, setPhase] = useState<'countdown' | 'recording' | 'uploading' | 'done'>('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN);
  const [recordProgress, setRecordProgress] = useState(0);
  const [cancelled, setCancelled] = useState(false);

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

        setPhase('uploading');
        await activateSOSWithVideo(groupId!, video.uri, groupName ?? 'Tu familia');
        setPhase('done');
        router.replace({
          pathname: '/(app)/sos-active',
          params: { groupId, groupName }
        });
      } catch (e: any) {
        clearInterval(progressInterval);
        if (!cancelledRef.current) {
          Alert.alert('Error', e.message);
          router.replace('/(app)/home');
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

  const handleCancel = () => {
    cancelledRef.current = true;
    setCancelled(true);
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
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        mode="video"
      />

      {/* Overlay rojo */}
      <View style={styles.overlay}>
        {phase === 'countdown' && (
          <Animated.View style={[styles.countdownWrap, { transform: [{ scale: pulse }] }]}>
            <Text style={styles.countdownNum}>{countdown}</Text>
            <Text style={styles.countdownLabel}>Grabando en...</Text>
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
              <Animated.View style={[styles.progressFill, { width: `${recordProgress * 100}%` }]} />
            </View>
            <Text style={styles.recSub}>{Math.round(recordProgress * RECORD_SECONDS)}s / {RECORD_SECONDS}s</Text>
            <Text style={styles.recInfo}>Video siendo enviado a tu grupo</Text>
          </View>
        )}

        {phase === 'uploading' && (
          <View style={styles.recordingWrap}>
            <Text style={styles.uploadIcon}>📤</Text>
            <Text style={styles.recLabel}>Enviando alerta...</Text>
            <Text style={styles.recSub}>Notificando a tu familia</Text>
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
});
