// 📁 cercania/app-scaffold/app/_layout.tsx
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as ExpoNotifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../src/store/auth';
import { AppSplashScreen } from '../src/components/ui/SplashScreen';
import {
  registerForPushNotifications,
  setupNotificationListeners
} from '../src/services/notifications.service';
import { useAppUpdate } from '../src/hooks/useAppUpdate';
import { UpdateModal } from '../src/components/ui/UpdateModal';

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const init = useAuth(s => s.init);
  const initializing = useAuth(s => s.initializing);
  const session = useAuth(s => s.session);
  const settings = useAuth(s => s.settings);
  const biometricGateOpen = useAuth(s => s.biometricGateOpen);
  const openBiometricGate = useAuth(s => s.openBiometricGate);
  const router = useRouter();
  const segments = useSegments();
  const notifTokenRegistered = useRef(false);
  const { updateAvailable, updateInfo, dismiss } = useAppUpdate();

  // Inicializar auth
  useEffect(() => {
    init().finally(() => SplashScreen.hideAsync().catch(() => { }));
  }, [init]);

  // Registrar token push cuando hay sesión
  useEffect(() => {
    if (session && !notifTokenRegistered.current) {
      notifTokenRegistered.current = true;
      registerForPushNotifications().catch(console.warn);
    }
  }, [session]);

  // Listeners de notificaciones
  useEffect(() => {
    const cleanup = setupNotificationListeners(
      (notification) => {
        // Notificación recibida con app abierta
        console.log('[Notif] Recibida:', notification.request.content.title);
      },
      (response) => {
        // Usuario tocó la notificación
        const data = response.notification.request.content.data;
        if (data?.type === 'sos' && data?.groupId) {
          router.push({
            pathname: '/(app)/map/[groupId]',
            params: { groupId: data.groupId }
          });
        } else if (data?.type === 'trusted_contact_invite') {
          router.push('/(app)/settings/trusted-contacts');
        } else if (data?.type === 'recovery') {
          router.push('/(app)/settings/trusted-contacts');
        } else if (data?.type === 'checkin_prompt' && data?.zoneId) {
          router.push('/(app)/home');
        } else if (data?.type === 'daily_summary') {
          router.push('/(app)/home');
        } else if (data?.type === 'gathering' && data?.groupId) {
          router.push({
            pathname: '/(app)/map/[groupId]',
            params: { groupId: data.groupId }
          });
        } else if (data?.type === 'low_battery') {
          router.push('/(app)/home');
        }
      }
    );
    return cleanup;
  }, [router]);

  // Biometría al volver de background
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status === 'active' && session && settings?.biometric_enabled) {
        openBiometricGate();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [session, settings, openBiometricGate]);

  // Navegación basada en auth
  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    const onGate = segments[0] === 'biometric-gate';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/welcome');
    } else if (biometricGateOpen) {
      if (!onGate) router.replace('/biometric-gate');
    } else {
      if (!inAppGroup) router.replace('/(app)/home');
    }
  }, [initializing, session, biometricGateOpen, segments, router]);

  if (initializing) {
    return <AppSplashScreen />;
  }

  return (
    <>
      <StatusBar style="dark" />
      {updateAvailable && updateInfo && (
        <UpdateModal visible info={updateInfo} onDismiss={dismiss} />
      )}
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="biometric-gate" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}