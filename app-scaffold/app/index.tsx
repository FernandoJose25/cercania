// 📁 cercania/app-scaffold/app/index.tsx
/**
 * Punto de entrada. Solo redirige.
 * El _layout.tsx maneja la lógica real de routing según estado de sesión.
 */

import { Redirect } from 'expo-router';
import { useAuth } from '../src/store/auth';

export default function Index() {
  const session = useAuth(s => s.session);
  const initializing = useAuth(s => s.initializing);
  const biometricGateOpen = useAuth(s => s.biometricGateOpen);

  if (initializing) return null;
  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (biometricGateOpen) return <Redirect href="/biometric-gate" />;
  return <Redirect href="/(app)/home" />;
}
