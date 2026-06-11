/**
 * PREVIEW — Nueva pantalla Welcome / Auth
 * Paleta ámbar cálido. Eliminar cuando apruebes.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const C = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryLight: '#FEF3C7',
  primaryMid: '#FBBF24',
  bg: '#FFFBF0',
  bgAlt: '#FEF9EC',
  surface: '#FFFFFF',
  text: '#1C1917',
  textSoft: '#57534E',
  textMuted: '#A8A29E',
  border: '#E7E5E4',
};

export default function WelcomePreview() {
  const [loading, setLoading] = useState(false);

  return (
    <View style={styles.root}>

      {/* Fondo decorativo */}
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />
      <View style={styles.bgBlob3} />

      {/* Zona superior — ilustración */}
      <View style={styles.illustrationZone}>
        {/* Mapa simulado */}
        <View style={styles.mapCard}>
          <View style={styles.mapGrid}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={styles.mapLine} />
            ))}
          </View>

          {/* Pines */}
          <View style={[styles.pin, { left: 30, top: 25 }]}>
            <View style={[styles.pinBubble, { backgroundColor: C.primary }]}>
              <Text style={styles.pinEmoji}>👩</Text>
            </View>
            <View style={[styles.pinTail, { borderTopColor: C.primary }]} />
          </View>
          <View style={[styles.pin, { left: 130, top: 55 }]}>
            <View style={[styles.pinBubble, { backgroundColor: '#8B5CF6' }]}>
              <Text style={styles.pinEmoji}>👧</Text>
            </View>
            <View style={[styles.pinTail, { borderTopColor: '#8B5CF6' }]} />
          </View>
          <View style={[styles.pin, { left: 80, top: 100 }]}>
            <View style={[styles.pinBubble, { backgroundColor: '#10B981' }]}>
              <Text style={styles.pinEmoji}>👨</Text>
            </View>
            <View style={[styles.pinTail, { borderTopColor: '#10B981' }]} />
          </View>

          {/* Badge "En vivo" */}
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>En vivo</Text>
          </View>
        </View>

        {/* Floating cards */}
        <View style={[styles.floatCard, { top: 20, right: 10 }]}>
          <Text style={styles.floatIcon}>🆘</Text>
          <Text style={styles.floatLabel}>SOS</Text>
        </View>
        <View style={[styles.floatCard, { bottom: 30, left: 5 }]}>
          <Text style={styles.floatIcon}>🔔</Text>
          <Text style={styles.floatLabel}>Alerta</Text>
        </View>
      </View>

      {/* Zona inferior — texto y botón */}
      <View style={styles.bottom}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>📍 Localización familiar</Text>
        </View>

        <Text style={styles.title}>Mantente{'\n'}cerca de{'\n'}los tuyos</Text>

        <Text style={styles.subtitle}>
          Comparte tu ubicación en tiempo real con tu familia. Alertas SOS, zonas seguras y privacidad total.
        </Text>

        {/* Features pills */}
        <View style={styles.pillsRow}>
          {['📍 Tiempo real', '🆘 SOS', '🔒 Privado', '🔋 Eficiente'].map(f => (
            <View key={f} style={styles.pill}>
              <Text style={styles.pillText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Botón Google */}
        <Pressable
          style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={() => setLoading(true)}
        >
          <View style={styles.gIconBox}>
            <Text style={styles.gIcon}><Text style={{ color: '#4285F4' }}>G</Text></Text>
          </View>
          <Text style={styles.googleLabel}>Continuar con Google</Text>
        </Pressable>

        <Text style={styles.terms}>
          Al continuar aceptas los{' '}
          <Text style={{ color: C.primary, fontWeight: '700' }}>Términos de uso</Text>
          {' '}y la{' '}
          <Text style={{ color: C.primary, fontWeight: '700' }}>Política de privacidad</Text>
        </Text>

        <Pressable style={styles.recoveryBtn}>
          <Text style={styles.recoveryText}>¿Perdiste acceso a tu cuenta?</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  bgBlob1: { position: 'absolute', width: 350, height: 350, borderRadius: 999, backgroundColor: C.primaryLight, top: -80, left: -80, opacity: 0.6 },
  bgBlob2: { position: 'absolute', width: 200, height: 200, borderRadius: 999, backgroundColor: '#FDE68A', top: 80, right: -60, opacity: 0.4 },
  bgBlob3: { position: 'absolute', width: 150, height: 150, borderRadius: 999, backgroundColor: C.primaryLight, bottom: 200, right: 20, opacity: 0.3 },

  illustrationZone: {
    height: height * 0.44, justifyContent: 'center', alignItems: 'center', paddingTop: 48,
  },

  mapCard: {
    width: 240, height: 175, backgroundColor: C.surface, borderRadius: 24, overflow: 'hidden',
    borderWidth: 2, borderColor: '#FDE68A',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10,
  },
  mapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.06 },
  mapLine: { flex: 1, borderBottomWidth: 1, borderBottomColor: C.primary },

  pin: { position: 'absolute', alignItems: 'center' },
  pinBubble: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  pinEmoji: { fontSize: 20 },
  pinTail: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },

  liveBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#D1FAE5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#065F46' },

  floatCard: {
    position: 'absolute', backgroundColor: C.surface, borderRadius: 16, padding: 10, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
    borderWidth: 1, borderColor: C.border,
  },
  floatIcon: { fontSize: 22 },
  floatLabel: { fontSize: 10, fontWeight: '700', color: C.textSoft, marginTop: 2 },

  bottom: {
    flex: 1, paddingHorizontal: 28, paddingTop: 8,
  },

  badge: {
    alignSelf: 'flex-start', backgroundColor: C.primaryLight, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: C.primaryDark },

  title: { fontSize: 38, fontWeight: '900', color: C.text, letterSpacing: -1, lineHeight: 44, marginBottom: 12 },
  subtitle: { fontSize: 15, color: C.textSoft, lineHeight: 22, marginBottom: 16 },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  pill: { backgroundColor: C.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: C.border },
  pillText: { fontSize: 12, color: C.textSoft, fontWeight: '600' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    height: 56, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    marginBottom: 16,
  },
  gIconBox: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  gIcon: { fontSize: 22, fontWeight: '800' },
  googleLabel: { fontSize: 16, fontWeight: '700', color: '#1C1917' },

  terms: { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18 },
  recoveryBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  recoveryText: { fontSize: 13, color: C.textMuted, textDecorationLine: 'underline' },
});
