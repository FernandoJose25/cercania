// 📁 cercania/app-scaffold/app/(app)/settings/share-location.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable,
  ScrollView, Share, StyleSheet, Text, View
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../../src/lib/theme';
import {
  ShareLink, ShareDuration,
  createShareLink, getActiveShareLinks,
  revokeShareLink, formatExpiry,
} from '../../../src/services/share-location.service';

const DURATION_OPTIONS: { value: ShareDuration; label: string; icon: string; desc: string }[] = [
  { value: '15min', label: '15 min', icon: '⚡', desc: 'Para que te recojan' },
  { value: '1h', label: '1 hora', icon: '🕐', desc: 'Para una cita' },
  { value: '4h', label: '4 horas', icon: '🕓', desc: 'Tarde fuera' },
  { value: '24h', label: '24 horas', icon: '📅', desc: 'Un día de viaje' },
];

function LinkCard({ link, onRevoke }: { link: ShareLink; onRevoke: () => void }) {
  const [expiry, setExpiry] = useState(formatExpiry(link.expiresAt));

  useEffect(() => {
    const interval = setInterval(() => setExpiry(formatExpiry(link.expiresAt)), 30000);
    return () => clearInterval(interval);
  }, [link.expiresAt]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Te comparto mi ubicación en vivo por ${link.label}: ${link.url}`,
        url: link.url,
        title: 'Mi ubicación — Cercanía',
      });
    } catch (_) {}
  };

  const handleRevoke = () => {
    Alert.alert(
      'Revocar link',
      '¿Seguro que quieres desactivar este link? Quien lo tenga ya no podrá ver tu ubicación.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Revocar', style: 'destructive', onPress: onRevoke },
      ]
    );
  };

  return (
    <View style={linkStyles.card}>
      <View style={linkStyles.topRow}>
        <View style={linkStyles.badge}>
          <View style={linkStyles.liveDot} />
          <Text style={linkStyles.liveText}>EN VIVO</Text>
        </View>
        <Text style={linkStyles.expiry}>{expiry}</Text>
      </View>
      <Text style={linkStyles.url} numberOfLines={1} ellipsizeMode="middle">
        {link.url}
      </Text>
      <Text style={linkStyles.duration}>Duración: {link.label}</Text>
      <View style={linkStyles.btnRow}>
        <Pressable style={linkStyles.shareBtn} onPress={handleShare}>
          <Text style={linkStyles.shareBtnText}>↑ Compartir link</Text>
        </Pressable>
        <Pressable style={linkStyles.revokeBtn} onPress={handleRevoke}>
          <Text style={linkStyles.revokeBtnText}>✕ Revocar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const linkStyles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadows.card, borderWidth: 1.5, borderColor: Colors.primary + '44' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.accentLight, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  liveText: { fontSize: 10, fontWeight: '800', color: Colors.accentDark, letterSpacing: 1 },
  expiry: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  url: { ...Typography.caption, color: Colors.textSoft, backgroundColor: Colors.bgAlt, borderRadius: Radius.md, padding: 8, marginBottom: Spacing.xs },
  duration: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.md },
  btnRow: { flexDirection: 'row', gap: Spacing.sm },
  shareBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.pill, paddingVertical: 10, alignItems: 'center' },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  revokeBtn: { backgroundColor: Colors.dangerLight, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  revokeBtnText: { fontSize: 13, fontWeight: '700', color: Colors.danger },
});

export default function ShareLocationScreen() {
  const [activeLinks, setActiveLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<ShareDuration>('1h');

  const loadLinks = useCallback(async () => {
    const links = await getActiveShareLinks();
    setActiveLinks(links);
    setLoading(false);
  }, []);

  useEffect(() => { loadLinks(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const link = await createShareLink(selectedDuration);
      setActiveLinks(prev => [link, ...prev]);

      // Abrir diálogo de compartir inmediatamente
      await Share.share({
        message: `Te comparto mi ubicación en vivo por ${link.label}: ${link.url}`,
        url: link.url,
        title: 'Mi ubicación — Cercanía',
      });
    } catch (e: any) {
      if (e.message !== 'User did not share') Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await revokeShareLink(id);
    setActiveLinks(prev => prev.filter(l => l.id !== id));
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBg} />
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>🔗 Compartir ubicación</Text>
        <Text style={styles.headerSub}>Comparte tu posición en vivo con cualquier persona, sin que esté en tu grupo</Text>
      </View>

      {/* Crear nuevo link */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>NUEVO LINK TEMPORAL</Text>
        <Text style={styles.sectionDesc}>El link expirará automáticamente. Elige cuánto tiempo dura:</Text>
        <View style={styles.durationGrid}>
          {DURATION_OPTIONS.map(opt => (
            <Pressable
              key={opt.value}
              style={[styles.durationCard, selectedDuration === opt.value && styles.durationCardActive]}
              onPress={() => setSelectedDuration(opt.value)}
            >
              <Text style={styles.durationIcon}>{opt.icon}</Text>
              <Text style={[styles.durationLabel, selectedDuration === opt.value && styles.durationLabelActive]}>
                {opt.label}
              </Text>
              <Text style={styles.durationDesc}>{opt.desc}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.createBtn, creating && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={creating}
        >
          {creating
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.createBtnText}>✨ Generar link y compartir</Text>
          }
        </Pressable>
      </View>

      {/* Links activos */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>LINKS ACTIVOS</Text>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
        ) : activeLinks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔗</Text>
            <Text style={styles.emptyTitle}>Sin links activos</Text>
            <Text style={styles.emptyText}>Los links que crees aparecerán aquí</Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.md }}>
            {activeLinks.map(link => (
              <LinkCard key={link.id} link={link} onRevoke={() => handleRevoke(link.id)} />
            ))}
          </View>
        )}
      </View>

      {/* Info de privacidad */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🔒 Privacidad</Text>
        <Text style={styles.infoText}>
          • Solo quien tenga el link puede ver tu ubicación{'\n'}
          • El link expira automáticamente al tiempo elegido{'\n'}
          • Puedes revocar el link en cualquier momento{'\n'}
          • Tu historial normal no se afecta
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 48 },
  header: { paddingHorizontal: Spacing.xl, paddingTop: 52, paddingBottom: Spacing.xl, position: 'relative', overflow: 'hidden' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bgAlt, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, ...Shadows.card },
  backIcon: { fontSize: 18, color: Colors.text, fontWeight: '700' },
  headerTitle: { ...Typography.h1, color: Colors.text },
  headerSub: { ...Typography.body, color: Colors.textSoft, marginTop: 4, lineHeight: 21 },

  section: { marginHorizontal: Spacing.xl, marginTop: Spacing.xl },
  sectionLabel: { ...Typography.label, color: Colors.textMuted, marginBottom: Spacing.xs },
  sectionDesc: { ...Typography.caption, color: Colors.textSoft, marginBottom: Spacing.md },

  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  durationCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, ...Shadows.card },
  durationCardActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  durationIcon: { fontSize: 28, marginBottom: 6 },
  durationLabel: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  durationLabelActive: { color: Colors.primaryDark },
  durationDesc: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },

  createBtn: { backgroundColor: Colors.primary, borderRadius: Radius.xl, paddingVertical: 16, alignItems: 'center', ...Shadows.button },
  createBtnDisabled: { backgroundColor: Colors.border },
  createBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  emptyCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.text },
  emptyText: { ...Typography.body, color: Colors.textSoft, textAlign: 'center', marginTop: 4 },

  infoCard: { marginHorizontal: Spacing.xl, marginTop: Spacing.xl, backgroundColor: Colors.bgAlt, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  infoTitle: { ...Typography.bodyBold, color: Colors.text, marginBottom: Spacing.sm },
  infoText: { ...Typography.body, color: Colors.textSoft, lineHeight: 22 },
});
