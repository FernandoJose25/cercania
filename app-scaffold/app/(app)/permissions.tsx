// 📁 cercania/app-scaffold/app/(app)/permissions.tsx
/**
 * Pantalla de permisos de onboarding.
 * Se muestra la primera vez o cuando faltan permisos críticos.
 * Pide de una sola vez: ubicación en background, notificaciones, cámara y micrófono.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { router } from 'expo-router';
import * as ExpoNotifications from 'expo-notifications';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../src/lib/theme';
import { useTracking } from '../../src/store/tracking';

interface PermState {
  location: 'unknown' | 'granted' | 'denied';
  notifications: 'unknown' | 'granted' | 'denied';
  camera: 'unknown' | 'granted' | 'denied';
  microphone: 'unknown' | 'granted' | 'denied';
}

const PERMS: { key: keyof PermState; icon: string; title: string; desc: string }[] = [
  {
    key: 'location',
    icon: '📍',
    title: 'Ubicación en segundo plano',
    desc: 'Para que tu familia sepa dónde estás aunque la app esté cerrada.',
  },
  {
    key: 'notifications',
    icon: '🔔',
    title: 'Notificaciones',
    desc: 'Recibe alertas SOS y mensajes del grupo al instante.',
  },
  {
    key: 'camera',
    icon: '📸',
    title: 'Cámara',
    desc: 'Graba evidencia automáticamente al activar el SOS.',
  },
  {
    key: 'microphone',
    icon: '🎙️',
    title: 'Micrófono',
    desc: 'El video de evidencia del SOS incluye el audio del entorno.',
  },
];

export default function PermissionsScreen() {
  const requestLocationPermissions = useTracking(s => s.requestPermissions);
  const [loading, setLoading] = useState(false);
  const [perms, setPerms] = useState<PermState>({
    location: 'unknown',
    notifications: 'unknown',
    camera: 'unknown',
    microphone: 'unknown',
  });

  // Verificar estado actual de permisos al montar
  useEffect(() => {
    (async () => {
      const [notifStatus, camStatus, micStatus] = await Promise.all([
        ExpoNotifications.getPermissionsAsync(),
        Camera.getCameraPermissionsAsync(),
        Audio.getPermissionsAsync(),
      ]);
      setPerms(prev => ({
        ...prev,
        notifications: notifStatus.granted ? 'granted' : 'unknown',
        camera: camStatus.granted ? 'granted' : 'unknown',
        microphone: micStatus.granted ? 'granted' : 'unknown',
      }));
    })();
  }, []);

  const handleRequestAll = async () => {
    setLoading(true);
    try {
      // 1. Ubicación background (el store ya maneja el flujo iOS/Android)
      await requestLocationPermissions();
      const locationPerms = useTracking.getState().permissions;
      setPerms(prev => ({ ...prev, location: locationPerms?.background ? 'granted' : 'denied' }));

      // 2. Notificaciones
      const notifResult = await ExpoNotifications.requestPermissionsAsync();
      setPerms(prev => ({ ...prev, notifications: notifResult.granted ? 'granted' : 'denied' }));

      // 3. Cámara
      const camResult = await Camera.requestCameraPermissionsAsync();
      setPerms(prev => ({ ...prev, camera: camResult.granted ? 'granted' : 'denied' }));

      // 4. Micrófono
      const micResult = await Audio.requestPermissionsAsync();
      setPerms(prev => ({ ...prev, microphone: micResult.granted ? 'granted' : 'denied' }));

      // Si al menos ubicación está otorgada, continuar
      const updatedPerms = useTracking.getState().permissions;
      if (updatedPerms?.background) {
        router.replace('/(app)/home');
      } else if (!updatedPerms?.canAskAgain) {
        Alert.alert(
          'Ubicación requerida',
          'Cercanía necesita acceso a tu ubicación para funcionar. Ve a Ajustes del sistema y activa "Ubicación → Siempre".',
          [
            { text: 'Más tarde', style: 'cancel' },
            { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(app)/home');
  };

  const allGranted = Object.values(perms).every(v => v === 'granted');

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topDecor} />
        <View style={styles.iconBox}>
          <Text style={styles.iconBig}>🔐</Text>
        </View>
        <Text style={styles.title}>Permisos necesarios</Text>
        <Text style={styles.subtitle}>
          Para que Cercanía funcione correctamente, necesita estos permisos.{'\n'}
          Se pedirán uno a uno — solo tarda unos segundos.
        </Text>

        {/* Lista de permisos */}
        <View style={styles.card}>
          {PERMS.map((p, i) => {
            const status = perms[p.key];
            return (
              <View key={p.key} style={[styles.permRow, i < PERMS.length - 1 && styles.permRowBorder]}>
                <View style={styles.permIcon}>
                  <Text style={styles.permEmoji}>{p.icon}</Text>
                </View>
                <View style={styles.permInfo}>
                  <Text style={styles.permTitle}>{p.title}</Text>
                  <Text style={styles.permDesc}>{p.desc}</Text>
                </View>
                <View style={[
                  styles.permBadge,
                  status === 'granted' && styles.permBadgeGranted,
                  status === 'denied' && styles.permBadgeDenied,
                ]}>
                  <Text style={[
                    styles.permBadgeText,
                    status === 'granted' && styles.permBadgeTextGranted,
                    status === 'denied' && styles.permBadgeTextDenied,
                  ]}>
                    {status === 'granted' ? '✓' : status === 'denied' ? '✗' : '—'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {Platform.OS === 'ios' && (
          <View style={styles.iosNote}>
            <Text style={styles.iosNoteText}>
              En iOS aparecerán varios diálogos seguidos. Para ubicación, elige{' '}
              <Text style={{ fontWeight: '800' }}>"Siempre permitir"</Text>.
            </Text>
          </View>
        )}

        <View style={styles.privNote}>
          <Text style={styles.privText}>
            🔒 Solo tu grupo familiar ve tu ubicación. Puedes pausarla cuando quieras con el Modo Invisible.
          </Text>
        </View>
      </ScrollView>

      {/* Botones fijos abajo */}
      <View style={styles.actions}>
        <Button
          title={allGranted ? 'Continuar →' : 'Activar todos los permisos'}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onPress={allGranted ? handleSkip : handleRequestAll}
        />
        <Pressable onPress={handleSkip} hitSlop={10} style={styles.skip}>
          <Text style={styles.skipText}>Omitir por ahora (funciones limitadas)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 160 },
  topDecor: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 220,
    backgroundColor: Colors.bgAlt,
    borderBottomLeftRadius: 48, borderBottomRightRadius: 48,
  },
  iconBox: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginTop: 72,
    ...Shadows.glow,
  },
  iconBig: { fontSize: 44 },
  title: { ...Typography.h1, color: Colors.text, textAlign: 'center', marginTop: Spacing.xl },
  subtitle: {
    ...Typography.body, color: Colors.textSoft, textAlign: 'center',
    lineHeight: 22, marginTop: Spacing.sm, marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    ...Shadows.card,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  permRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md,
  },
  permRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  permIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  permEmoji: { fontSize: 22 },
  permInfo: { flex: 1 },
  permTitle: { ...Typography.bodyBold, color: Colors.text },
  permDesc: { ...Typography.caption, color: Colors.textSoft, marginTop: 2, lineHeight: 16 },
  permBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  permBadgeGranted: { backgroundColor: '#D1FAE5', borderColor: '#059669' },
  permBadgeDenied: { backgroundColor: '#FEE2E2', borderColor: '#DC2626' },
  permBadgeText: { fontSize: 14, fontWeight: '800', color: Colors.textMuted },
  permBadgeTextGranted: { color: '#059669' },
  permBadgeTextDenied: { color: '#DC2626' },
  iosNote: {
    backgroundColor: Colors.primaryLight, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  iosNoteText: { ...Typography.caption, color: Colors.primaryDark, lineHeight: 18, textAlign: 'center' },
  privNote: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  privText: { ...Typography.caption, color: Colors.textSoft, lineHeight: 18, textAlign: 'center' },
  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.xl, paddingBottom: 36, paddingTop: Spacing.md,
    backgroundColor: Colors.bg,
    borderTopWidth: 1, borderTopColor: Colors.border,
    gap: Spacing.xs,
  },
  skip: { alignItems: 'center', padding: Spacing.sm },
  skipText: { ...Typography.caption, color: Colors.textMuted },
});
