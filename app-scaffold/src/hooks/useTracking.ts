// 📁 cercania/app-scaffold/src/hooks/useTracking.ts

import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useTrackingStore } from '../store/tracking';

/**
 * Hook principal para consumir el estado de tracking en componentes React.
 *
 * - Llama initialize() al montar para sincronizar con el SO.
 * - Re-sincroniza al volver desde background (el usuario puede haber cambiado
 *   permisos en Ajustes del sistema mientras la app estaba en segundo plano).
 */
export function useTracking() {
  const store = useTrackingStore();

  useEffect(() => {
    store.initialize();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        // Volvimos de background: re-verificar estado real del SO
        store.initialize();
      }
    });

    return () => sub.remove();
  }, []);

  return {
    ...store,
    /** true solo si AMBOS permisos (foreground + background) están concedidos */
    hasFullPermissions:
      store.permissionForeground === 'granted' &&
      store.permissionBackground === 'granted',
    /** true si al menos falta un permiso */
    needsPermissions:
      store.permissionForeground !== 'granted' ||
      store.permissionBackground !== 'granted',
  };
}
