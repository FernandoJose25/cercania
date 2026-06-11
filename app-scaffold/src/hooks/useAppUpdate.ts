// 📁 cercania/app-scaffold/src/hooks/useAppUpdate.ts
import { useState, useEffect } from 'react';
import { checkForUpdate, RemoteVersion } from '../services/update.service';

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<RemoteVersion | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdate().then(result => {
      if (result.available && result.remote) {
        setUpdateInfo(result.remote);
      }
    });
  }, []);

  return {
    updateAvailable: !!updateInfo && !dismissed,
    updateInfo,
    dismiss: () => setDismissed(true),   // solo para updates no obligatorios
  };
}
