// 📁 cercania/app-scaffold/src/services/update.service.ts
import * as Application from 'expo-application';

// Cambia esta URL cuando tengas tu servidor/GitHub Pages listo
const VERSION_URL = 'https://cercania.vercel.app/version.json';

export interface RemoteVersion {
  version: string;       // "1.2.0"
  mandatory: boolean;    // true = no se puede cerrar el modal
  message: string;       // descripción del cambio
  url: string;           // enlace a la página de descarga
}

export interface UpdateInfo {
  available: boolean;
  remote?: RemoteVersion;
}

function parseVersion(v: string): number[] {
  return v.split('.').map(Number);
}

function isNewer(remote: string, local: string): boolean {
  const r = parseVersion(remote);
  const l = parseVersion(local);
  for (let i = 0; i < 3; i++) {
    if ((r[i] ?? 0) > (l[i] ?? 0)) return true;
    if ((r[i] ?? 0) < (l[i] ?? 0)) return false;
  }
  return false;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  try {
    const res = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!res.ok) return { available: false };

    const remote: RemoteVersion = await res.json();
    const local = Application.nativeApplicationVersion ?? '0.0.0';

    if (isNewer(remote.version, local)) {
      return { available: true, remote };
    }
    return { available: false };
  } catch {
    // Sin conexión o servidor caído — no bloquear el arranque
    return { available: false };
  }
}
