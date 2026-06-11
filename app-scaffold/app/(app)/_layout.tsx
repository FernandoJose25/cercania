import React, { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '../../src/store/auth';
import { useTracking } from '../../src/store/tracking';
import { markInstallDate, shouldAskForReview } from '../../src/services/review.service';
import { ReviewModal } from '../../src/components/ui/ReviewModal';

export default function AppLayout() {
  const session = useAuth(s => s.session);
  const { init } = useTracking();
  const didCheck = useRef(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (!session || didCheck.current) return;
    didCheck.current = true;
    init();
    markInstallDate();
    // Espera 5 segundos después del login para no interrumpir el arranque
    setTimeout(async () => {
      const should = await shouldAskForReview();
      if (should) setShowReview(true);
    }, 5000);
  }, [session]);

  return (
    <>
    <ReviewModal visible={showReview} onClose={() => setShowReview(false)} />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="permissions" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="settings/biometric" />
      <Stack.Screen name="group/create" />
      <Stack.Screen name="group/join" />
      <Stack.Screen name="group/[id]/index" />
      <Stack.Screen name="map" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings/trusted-contacts" />
      <Stack.Screen name="settings/invisible-mode" />
      <Stack.Screen name="settings/geofences" />
      <Stack.Screen name="settings/travel-mode" />
      <Stack.Screen name="settings/share-location" />
      <Stack.Screen name="history" />
      <Stack.Screen name="group/[id]/chat" />
      <Stack.Screen name="sos-active" options={{ gestureEnabled: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="sos-record" options={{ gestureEnabled: false, presentation: 'fullScreenModal' }} />
    </Stack>
    </>
  );
}