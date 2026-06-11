// 📁 cercania/app-scaffold/src/hooks/useBatteryStatus.ts
/**
 * Hook para leer nivel y estado de carga de la batería.
 * Se actualiza automáticamente.
 */

import { useState, useEffect } from 'react';
import * as Battery from 'expo-battery';

interface BatteryStatus {
  level: number | null;       // 0-100
  isCharging: boolean;
  isLow: boolean;             // true si < 15%
}

export function useBatteryStatus(): BatteryStatus {
  const [status, setStatus] = useState<BatteryStatus>({
    level: null,
    isCharging: false,
    isLow: false
  });

  useEffect(() => {
    let levelSub: Battery.Subscription;
    let stateSub: Battery.Subscription;

    const init = async () => {
      try {
        const level = Math.round((await Battery.getBatteryLevelAsync()) * 100);
        const state = await Battery.getBatteryStateAsync();
        const isCharging =
          state === Battery.BatteryState.CHARGING ||
          state === Battery.BatteryState.FULL;
        setStatus({ level, isCharging, isLow: level <= 15 });
      } catch (_) {}
    };

    init();

    levelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      const level = Math.round(batteryLevel * 100);
      setStatus(prev => ({ ...prev, level, isLow: level <= 15 }));
    });

    stateSub = Battery.addBatteryStateListener(({ batteryState }) => {
      const isCharging =
        batteryState === Battery.BatteryState.CHARGING ||
        batteryState === Battery.BatteryState.FULL;
      setStatus(prev => ({ ...prev, isCharging }));
    });

    return () => {
      levelSub?.remove();
      stateSub?.remove();
    };
  }, []);

  return status;
}
