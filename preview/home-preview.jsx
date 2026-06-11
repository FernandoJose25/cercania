/**
 * PREVIEW — Nueva pantalla Home
 * Paleta: Ámbar/Naranja cálido (identidad Cercanía)
 * Eliminar este archivo cuando apruebes el diseño.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// ─── NUEVA PALETA ─────────────────────────────────────────
const C = {
  primary: '#F59E0B',       // Ámbar principal
  primaryDark: '#D97706',   // Ámbar oscuro
  primaryDeep: '#92400E',   // Ámbar muy oscuro
  primaryLight: '#FEF3C7',  // Ámbar muy claro
  primaryMid: '#FBBF24',    // Ámbar medio
  primaryGlow: 'rgba(245,158,11,0.15)',

  accent: '#10B981',        // Verde esmeralda (estado activo)
  accentLight: '#D1FAE5',
  accentDark: '#065F46',

  bg: '#FFFBF0',            // Fondo cálido
  bgAlt: '#FEF9EC',         // Fondo alternativo
  surface: '#FFFFFF',
  surfaceAlt: '#FFF8E1',
  card: '#FFFFFF',

  text: '#1C1917',          // Stone 900
  textSoft: '#57534E',      // Stone 600
  textMuted: '#A8A29E',     // Stone 400

  border: '#E7E5E4',        // Stone 200
  borderWarm: '#FDE68A',    // Ámbar claro

  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#10B981',
  warning: '#F59E0B',
};

// ─── COMPONENTES DE PREVIEW ───────────────────────────────

function Avatar({ name, size = 44 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <View style={[avStyles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[avStyles.text, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}
const avStyles = StyleSheet.create({
  wrap: { backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  text: { color: '#fff', fontWeight: '800' },
});

function StatusPill({ active }) {
  return (
    <View style={[spStyles.pill, { backgroundColor: active ? C.accentLight : '#F5F5F4' }]}>
      <View style={[spStyles.dot, { backgroundColor: active ? C.accent : C.textMuted }]} />
      <Text style={[spStyles.text, { color: active ? C.accentDark : C.textMuted }]}>
        {active ? 'Activo' : 'Pausado'}
      </Text>
    </View>
  );
}
const spStyles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '700' },
});

function GroupCard({ emoji, name, memberCount, hasAlert }) {
  return (
    <Pressable style={gcStyles.card}>
      <View style={gcStyles.emojiBox}>
        <Text style={gcStyles.emoji}>{emoji}</Text>
      </View>
      <View style={gcStyles.info}>
        <Text style={gcStyles.name}>{name}</Text>
        <Text style={gcStyles.sub}>{memberCount} miembros • Ver mapa</Text>
      </View>
      {hasAlert && (
        <View style={gcStyles.alertDot} />
      )}
      <View style={gcStyles.arrow}>
        <Text style={gcStyles.arrowText}>›</Text>
      </View>
    </Pressable>
  );
}
const gcStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderRadius: 20, padding: 16,
    marginBottom: 10, borderWidth: 1.5, borderColor: C.border,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  emojiBox: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  sub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  alertDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.danger, marginRight: 4 },
  arrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 20, color: C.primary, fontWeight: '800' },
});

// ─── PANTALLA PRINCIPAL ───────────────────────────────────

export default function HomePreview() {
  const [tracking, setTracking] = useState(true);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── HEADER HERO ── */}
        <View style={styles.hero}>
          {/* Círculos decorativos */}
          <View style={[styles.heroDeco, { width: 220, height: 220, top: -60, right: -40, opacity: 0.12 }]} />
          <View style={[styles.heroDeco, { width: 140, height: 140, top: 20, right: 60, opacity: 0.08 }]} />

          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroGreeting}>¡Hola, Fernando! 👋</Text>
              <StatusPill active={tracking} />
            </View>
            <View style={styles.heroRight}>
              <View style={styles.batteryBadge}>
                <Text style={styles.batteryText}>🔋 84%</Text>
              </View>
              <Avatar name="Fernando Jose" size={46} />
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>3</Text>
              <Text style={styles.statLabel}>Grupos</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: tracking ? '#D1FAE5' : '#F5F5F4' }]}>
              <Text style={styles.statNum}>{tracking ? '🟢' : '⚫'}</Text>
              <Text style={styles.statLabel}>GPS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>12</Text>
              <Text style={styles.statLabel}>Miembros</Text>
            </View>
          </View>
        </View>

        {/* ── TRACKER CARD ── */}
        <View style={[styles.trackerCard, tracking && styles.trackerCardOn]}>
          <View style={styles.trackerLeft}>
            <View style={[styles.trackerIconBox, tracking && styles.trackerIconBoxOn]}>
              <Text style={styles.trackerIcon}>{tracking ? '📡' : '📵'}</Text>
            </View>
            <View>
              <Text style={styles.trackerTitle}>{tracking ? 'Compartiendo ubicación' : 'Rastreo pausado'}</Text>
              <Text style={styles.trackerSub}>
                {tracking ? 'Tu familia puede verte ahora' : 'Activa para ser visible'}
              </Text>
            </View>
          </View>
          <Switch
            value={tracking}
            onValueChange={setTracking}
            trackColor={{ false: '#E7E5E4', true: C.primary }}
            thumbColor="#fff"
            ios_backgroundColor="#E7E5E4"
          />
        </View>

        {/* ── SOS CARD ── */}
        <View style={styles.sosCard}>
          <View style={styles.sosRow}>
            <View>
              <Text style={styles.sosLabel}>EMERGENCIA</Text>
              <Text style={styles.sosTitle}>Botón SOS</Text>
              <Text style={styles.sosSub}>Mantén 3 segundos para activar</Text>
            </View>
            <Pressable style={styles.sosBtn}>
              <Text style={styles.sosBtnIcon}>🆘</Text>
              <Text style={styles.sosBtnText}>SOS</Text>
            </Pressable>
          </View>
        </View>

        {/* ── ACCIONES RÁPIDAS ── */}
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: C.primaryLight }]}>
              <Text style={styles.actionEmoji}>➕</Text>
            </View>
            <Text style={styles.actionLabel}>Crear grupo</Text>
          </Pressable>
          <Pressable style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Text style={styles.actionEmoji}>🔗</Text>
            </View>
            <Text style={styles.actionLabel}>Unirse</Text>
          </Pressable>
          <Pressable style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0F9FF' }]}>
              <Text style={styles.actionEmoji}>🗺️</Text>
            </View>
            <Text style={styles.actionLabel}>Ver mapa</Text>
          </Pressable>
        </View>

        {/* ── GRUPOS ── */}
        <Text style={styles.sectionTitle}>Mis grupos</Text>
        <GroupCard emoji="🏠" name="Familia García" memberCount={4} hasAlert={false} />
        <GroupCard emoji="🏫" name="Colegio Los Pinos" memberCount={8} hasAlert={true} />
        <GroupCard emoji="💼" name="Trabajo" memberCount={3} hasAlert={false} />

      </ScrollView>

      {/* ── TAB BAR INFERIOR (nueva) ── */}
      <View style={styles.tabBar}>
        {[
          { icon: '🏠', label: 'Inicio', active: true },
          { icon: '🗺️', label: 'Mapa', active: false },
          { icon: '🆘', label: 'SOS', active: false, big: true },
          { icon: '👥', label: 'Grupos', active: false },
          { icon: '⚙️', label: 'Ajustes', active: false },
        ].map(tab => (
          <Pressable key={tab.label} style={[styles.tabItem, tab.big && styles.tabItemBig]}>
            {tab.big ? (
              <View style={styles.tabSosBubble}>
                <Text style={styles.tabBigIcon}>{tab.icon}</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.tabIcon, tab.active && styles.tabIconActive]}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, tab.active && styles.tabLabelActive]}>{tab.label}</Text>
              </>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // HERO
  hero: {
    backgroundColor: C.bgAlt, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    borderBottomWidth: 1.5, borderBottomColor: C.borderWarm,
    overflow: 'hidden', position: 'relative', marginBottom: 16,
  },
  heroDeco: { position: 'absolute', borderRadius: 999, backgroundColor: C.primary },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroGreeting: { fontSize: 22, fontWeight: '900', color: C.text, marginBottom: 6 },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  batteryBadge: { backgroundColor: C.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  batteryText: { fontSize: 12, fontWeight: '700', color: C.text },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 12, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 20, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 11, color: C.textMuted, marginTop: 2, fontWeight: '600' },

  // TRACKER
  trackerCard: {
    marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderRadius: 22, padding: 16, borderWidth: 1.5, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    marginBottom: 12,
  },
  trackerCardOn: { borderColor: C.primary, backgroundColor: C.primaryLight },
  trackerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  trackerIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#F5F5F4', alignItems: 'center', justifyContent: 'center' },
  trackerIconBoxOn: { backgroundColor: C.primary },
  trackerIcon: { fontSize: 24 },
  trackerTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  trackerSub: { fontSize: 12, color: C.textSoft, marginTop: 2 },

  // SOS
  sosCard: {
    marginHorizontal: 20, backgroundColor: '#FFF1F2', borderRadius: 22, padding: 18,
    borderWidth: 1.5, borderColor: '#FFD5D5', marginBottom: 20,
  },
  sosRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sosLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: C.danger, marginBottom: 4 },
  sosTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  sosSub: { fontSize: 12, color: '#F87171', marginTop: 2 },
  sosBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.danger, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  sosBtnIcon: { fontSize: 24 },
  sosBtnText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  // SECCIONES
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginHorizontal: 20, marginBottom: 12, marginTop: 4 },

  // ACCIONES
  actionsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginBottom: 24 },
  actionCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 18, padding: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  actionIcon: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionEmoji: { fontSize: 24 },
  actionLabel: { fontSize: 12, fontWeight: '700', color: C.text },

  // TAB BAR
  tabBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface,
    flexDirection: 'row', alignItems: 'flex-end',
    paddingBottom: 24, paddingTop: 8, paddingHorizontal: 8,
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 12,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingBottom: 4 },
  tabItemBig: { flex: 1, alignItems: 'center', marginBottom: 8 },
  tabIcon: { fontSize: 22, marginBottom: 2 },
  tabIconActive: { transform: [{ scale: 1.1 }] },
  tabLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600' },
  tabLabelActive: { color: C.primary, fontWeight: '800' },
  tabSosBubble: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
    borderWidth: 3, borderColor: C.surface,
  },
  tabBigIcon: { fontSize: 26 },
});
