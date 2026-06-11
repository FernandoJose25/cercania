/**
 * PREVIEW — Nueva pantalla Perfil
 * Paleta ámbar. Eliminar cuando apruebes.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

const C = {
  primary: '#F59E0B', primaryDark: '#D97706', primaryLight: '#FEF3C7',
  bg: '#FFFBF0', surface: '#FFFFFF', surfaceAlt: '#FFF8E1',
  text: '#1C1917', textSoft: '#57534E', textMuted: '#A8A29E',
  border: '#E7E5E4', danger: '#EF4444', dangerLight: '#FEE2E2',
  success: '#10B981', successLight: '#D1FAE5',
};

function MenuItem({ icon, label, sub, color, arrow = true }) {
  return (
    <Pressable style={miStyles.row}>
      <View style={[miStyles.iconBox, { backgroundColor: color + '22' }]}>
        <Text style={miStyles.icon}>{icon}</Text>
      </View>
      <View style={miStyles.info}>
        <Text style={miStyles.label}>{label}</Text>
        {sub && <Text style={miStyles.sub}>{sub}</Text>}
      </View>
      {arrow && <Text style={miStyles.arrow}>›</Text>}
    </Pressable>
  );
}
const miStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: C.text },
  sub: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  arrow: { fontSize: 22, color: C.textMuted },
});

export default function ProfilePreview() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBg} />
        <Pressable style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Mi perfil</Text>
      </View>

      {/* Avatar hero */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>FJ</Text>
          </View>
          {/* Badge verificado */}
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedIcon}>✓</Text>
          </View>
        </View>
        <Text style={styles.avatarName}>Fernando Jose</Text>
        <Text style={styles.avatarEmail}>djjofer.25@gmail.com</Text>
        <View style={styles.memberBadge}>
          <Text style={styles.memberText}>📅 Miembro desde junio 2026</Text>
        </View>
      </View>

      {/* Stats rápidas */}
      <View style={styles.statsRow}>
        {[
          { num: '3', label: 'Grupos' },
          { num: '12', label: 'Miembros' },
          { num: '47d', label: 'Activo' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statNum}>{s.num}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Sección: Privacidad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacidad y seguridad</Text>
        <MenuItem icon="👁️‍🗨️" label="Modo invisible" sub="Pausa tu ubicación" color={C.primary} />
        <MenuItem icon="🛡️" label="Contactos de confianza" sub="Para recuperación de cuenta" color="#8B5CF6" />
        <MenuItem icon="🔐" label="Biometría" sub="Huella / Face ID" color="#10B981" />
      </View>

      {/* Sección: Cuenta */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <MenuItem icon="👤" label="Editar nombre" sub="Fernando Jose" color={C.primary} />
        <MenuItem icon="📱" label="Teléfono" sub="Sin configurar" color="#F59E0B" />
        <MenuItem icon="📧" label="Correo de respaldo" sub="Para recuperación" color="#06B6D4" />
      </View>

      {/* Sección: Actividad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actividad reciente</Text>
        <View style={styles.activityItem}>
          <View style={[styles.activityDot, { backgroundColor: C.success }]} />
          <View style={styles.activityInfo}>
            <Text style={styles.activityLabel}>Última ubicación compartida</Text>
            <Text style={styles.activityTime}>Hace 5 minutos</Text>
          </View>
        </View>
        <View style={styles.activityItem}>
          <View style={[styles.activityDot, { backgroundColor: C.primary }]} />
          <View style={styles.activityInfo}>
            <Text style={styles.activityLabel}>Grupo "Familia García" actualizado</Text>
            <Text style={styles.activityTime}>Hace 2 horas</Text>
          </View>
        </View>
      </View>

      {/* Zona peligrosa */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>⚠️ Zona peligrosa</Text>
        <Pressable style={styles.signOutBtn}>
          <Text style={styles.signOutIcon}>🚪</Text>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>
        <Pressable style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Eliminar cuenta permanentemente</Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 48 },

  header: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 24, position: 'relative', overflow: 'hidden' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FEF9EC', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  backIcon: { fontSize: 18, color: C.text, fontWeight: '700' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: C.text },

  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarRing: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  avatarText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.success, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: C.bg,
  },
  verifiedIcon: { fontSize: 12, color: '#fff', fontWeight: '900' },
  avatarName: { fontSize: 22, fontWeight: '900', color: C.text, marginBottom: 4 },
  avatarEmail: { fontSize: 14, color: C.textSoft, marginBottom: 10 },
  memberBadge: { backgroundColor: C.primaryLight, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5 },
  memberText: { fontSize: 12, fontWeight: '600', color: C.primaryDark },

  statsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 18, padding: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border },
  statNum: { fontSize: 22, fontWeight: '900', color: C.text },
  statLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', marginTop: 2 },

  section: { backgroundColor: C.surface, marginHorizontal: 20, borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },

  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border },
  activityDot: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  activityInfo: { flex: 1 },
  activityLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  activityTime: { fontSize: 12, color: C.textMuted, marginTop: 1 },

  dangerZone: { marginHorizontal: 20, backgroundColor: C.dangerLight, borderRadius: 20, padding: 16,
    borderWidth: 1.5, borderColor: '#FECACA', marginTop: 8 },
  dangerTitle: { fontSize: 14, fontWeight: '800', color: C.danger, marginBottom: 14 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface,
    borderRadius: 14, padding: 14, marginBottom: 10 },
  signOutIcon: { fontSize: 20 },
  signOutText: { fontSize: 15, fontWeight: '700', color: C.text },
  deleteBtn: { alignItems: 'center', paddingVertical: 12 },
  deleteText: { fontSize: 13, fontWeight: '700', color: C.danger, textDecorationLine: 'underline' },
});
