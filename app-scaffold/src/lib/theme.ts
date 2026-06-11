// 📁 cercania/app-scaffold/src/lib/theme.ts
import { Platform } from 'react-native';

// ═══════════════════════════════════════════════
// PALETA "ELECTRIC FAMILY"
// Azul profundo + Lima eléctrico
// ═══════════════════════════════════════════════
export const Colors = {
  // Azules
  primary: '#2563EB',   // Azul principal
  primaryDark: '#1D4ED8',   // Azul oscuro
  primaryDeep: '#1E3A8A',   // Azul muy profundo
  primaryLight: '#DBEAFE',   // Azul muy claro
  primaryMid: '#3B82F6',   // Azul medio
  primaryGlow: 'rgba(37,99,235,0.15)', // Glow azul

  // Lima eléctrico
  accent: '#A3E635',   // Lima vibrante
  accentDark: '#65A30D',   // Lima oscuro
  accentLight: '#ECFCCB',   // Lima muy claro
  accentGlow: 'rgba(163,230,53,0.2)', // Glow lima

  // Fondo
  bg: '#F8FAFF',
  bgAlt: '#F0F7FF',

  // Superficies
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  surfaceBlue: '#EFF6FF',
  card: '#FFFFFF',

  // Texto
  text: '#0F172A',   // Casi negro azulado
  textSoft: '#475569',
  textMuted: '#94A3B8',
  textWhite: '#FFFFFF',
  textOnBlue: '#FFFFFF',
  textOnLime: '#1A2E05',

  // Bordes
  border: '#E2E8F0',
  borderBlue: '#BFDBFE',
  borderFocus: '#2563EB',

  // Estados
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#06B6D4',

  // Mapa
  mapStale: '#94A3B8',
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
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  floating: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  button: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonLime: {
    shadowColor: '#65A30D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
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