// 📁 cercania/app-scaffold/src/lib/theme.ts
import { Platform } from 'react-native';

// ═══════════════════════════════════════════════
// PALETA "WARM FAMILY"
// Ámbar cálido — identidad Cercanía
// ═══════════════════════════════════════════════
export const Colors = {
  // Ámbar principal
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryDeep: '#92400E',
  primaryLight: '#FEF3C7',
  primaryMid: '#FBBF24',
  primaryGlow: 'rgba(245,158,11,0.18)',

  // Verde esmeralda (estado activo / éxito)
  accent: '#10B981',
  accentDark: '#065F46',
  accentLight: '#D1FAE5',
  accentGlow: 'rgba(16,185,129,0.18)',

  // Fondo
  bg: '#FFFBF0',
  bgAlt: '#FEF9EC',

  // Superficies
  surface: '#FFFFFF',
  surfaceAlt: '#FFF8E1',
  surfaceBlue: '#FEF9EC',
  card: '#FFFFFF',

  // Texto
  text: '#1C1917',
  textSoft: '#57534E',
  textMuted: '#A8A29E',
  textWhite: '#FFFFFF',
  textOnBlue: '#FFFFFF',
  textOnLime: '#1A2E05',

  // Bordes
  border: '#E7E5E4',
  borderBlue: '#FDE68A',
  borderFocus: '#F59E0B',

  // Estados
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#06B6D4',

  // Mapa
  mapStale: '#A8A29E',
};

// ═══════════════════════════════════════════════
// TIPOGRAFÍA
// ═══════════════════════════════════════════════
export const Typography = {
  display: {
    fontSize: 36,
    fontWeight: '900' as const,
    letterSpacing: -1,
    lineHeight: 42,
    color: Colors.text,
  },
  h1: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 34,
    color: Colors.text,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
    color: Colors.text,
  },
  h3: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
    color: Colors.text,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: Colors.text,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
    color: Colors.text,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: Colors.textMuted,
  },
  label: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: Colors.textSoft,
  },
};

// ═══════════════════════════════════════════════
// ESPACIADO
// ═══════════════════════════════════════════════
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

// ═══════════════════════════════════════════════
// RADIOS
// ═══════════════════════════════════════════════
export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
};

// ═══════════════════════════════════════════════
// SOMBRAS
// ═══════════════════════════════════════════════
export const Shadows = {
  card: {
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  floating: {
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  button: {
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonLime: {
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  glow: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
};

// ═══════════════════════════════════════════════
// TRACKING CONFIG
// ═══════════════════════════════════════════════
export const Tracking = {
  staleAfterMin: 15,
  bgIntervalMs: 3 * 60 * 1000,
  fgIntervalMs: 1000,
};
