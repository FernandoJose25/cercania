// 📁 cercania/app-scaffold/src/utils/format.ts
/**
 * Helpers de presentación: tiempos relativos, distancias, etc.
 * Todas las cadenas en español neutro de Latinoamérica.
 */

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/** "hace 5 minutos", "hace 2 horas", "hace 3 días" */
export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

/** "Visto hace 5 min" / "Visto ahora" / "Visto hace 2 h" - versión corta para pins del mapa */
export function lastSeenShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD} d`;
}

/** "320 m" / "1.2 km" */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Ícono de batería según nivel */
export function batteryIcon(level: number | null, charging?: boolean | null): string {
  if (level == null) return '🔋';
  if (charging) return '⚡';
  if (level <= 15) return '🪫';
  return '🔋';
}

/** Iniciales para avatar por defecto */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Convierte error de Supabase a mensaje legible */
export function humanizeAuthError(error: { message?: string } | null): string {
  if (!error) return '';
  const m = (error.message ?? '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos';
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de iniciar sesión';
  if (m.includes('user already registered')) return 'Este correo ya está registrado';
  if (m.includes('token has expired') || m.includes('otp expired')) return 'El código expiró, solicita uno nuevo';
  if (m.includes('invalid token') || m.includes('token is invalid')) return 'Código incorrecto';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos, espera un momento';
  if (m.includes('network')) return 'Sin conexión a internet';
  return error.message ?? 'Algo salió mal, intenta de nuevo';
}
