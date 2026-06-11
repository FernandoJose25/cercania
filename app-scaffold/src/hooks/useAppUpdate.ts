// 📁 cercania/app-scaffold/src/hooks/useAppUpdate.ts
import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { checkForUpdate, RemoteVersion } from '../services/update.service';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // recheck cada 1 hora si la app sigue abierta

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<RemoteVersion | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    const result = await checkForUpdate();
    if (result.available && result.remote) {
      setUpdateInfo(result.remote);
      setDismissed(false); // mostrar de nuevo si hay versión más nueva que la anterior
    }
  }, []);

  // Chequeo inicial al montar
  useEffect(() => { check(); }, [check]);

  // Rechequear cuando el usuario vuelve a poner la app en primer plano
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status === 'active') check();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [check]);

  // Rechequear cada hora mientras la app está abierta
  useEffect(() => {
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  return {
    updateAvailable: !!updateInfo && !dismissed,
    updateInfo,
    dismiss: () => setDismissed(true),
  };
}
