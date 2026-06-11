// 📁 cercania/app-scaffold/src/hooks/useLocationPermission.ts
/**
 * Hook que expone el estado de permisos de ubicación
 * y si el tracker está activo.
 */

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useTracking } from '../store/tracking';

export function useLocationPermission() {
  const { permissions, isTracking, init } = useTracking();

  // Re-verificar permisos cuando el usuario vuelve de Ajustes del sistema
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        init();
      }
    });
    return () => sub.remove();
  }, [init]);

  return {
    hasBackground: permissions?.background ?? false,
    hasForeground: permissions?.foreground ?? false,
    canAskAgain: permissions?.canAskAgain ?? true,
    isTracking
  };
}
