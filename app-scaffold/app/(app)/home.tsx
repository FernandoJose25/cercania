import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Pressable,
  RefreshControl, ScrollView, StyleSheet, Switch, Text, View
} from 'react-native';
import { router } from 'expo-router';
import { SOSButton } from '../../src/components/sos/SOSButton';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../src/lib/theme';
import { useAuth } from '../../src/store/auth';
import { useTracking } from '../../src/store/tracking';
import { useGroups } from '../../src/store/groups';
import { useBatteryStatus } from '../../src/hooks/useBatteryStatus';
import { getInitials } from '../../src/utils/format';
import { scheduleDailySummary } from '../../src/services/daily-summary.service';
import { getSupabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/ui/Button';

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const { isTracking, permissions, initializing, enableTracking, disableTracking, init: initTracking } = useTracking();
  const { groups, loading: groupsLoading, loadGroups } = useGroups();
  const battery = useBatteryStatus();
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [myActiveSOS, setMyActiveSOS] = useState<{ alertId: string; groupId: string; groupName: string } | null>(null);

  useEffect(() => {
    initTracking();
    loadGroups();
    scheduleDailySummary().catch(() => {});
    checkMyActiveSOS();
  }, []);

  const checkMyActiveSOS = async () => {
    if (!user?.id) return;
    try {
      const sb = await getSupabase();
      const { data } = await sb
        .from('sos_alerts')
        .select('id, group_id, groups(name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();
      if (data) {
        setMyActiveSOS({
          alertId: data.id,
          groupId: data.group_id,
          groupName: (data.groups as any)?.name ?? 'Tu familia',
        });
      }
    } catch { }
  };

  const handleToggle = async (value: boolean) => {
    if (value) {
      if (!permissions?.background) { router.push('/(app)/permissions'); return; }
      await enableTracking();
    } else { await disableTracking(); }
  };

  const handleSOS = () => {
    if (groups.length === 0) { Alert.alert('Sin grupos', 'Únete a un grupo primero.'); return; }
    if (groups.length === 1) confirmSOS(groups[0].id, groups[0].name);
    else setSosModalVisible(true);
  };

  const confirmSOS = (groupId: string, groupName: string) => {
    Alert.alert('¡EMERGENCIA!', `Enviar alerta SOS al grupo "${groupName}"?\n\nSe grabará un video de 10 segundos como evidencia.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'ACTIVAR SOS', style: 'destructive', onPress: () => {
          setSosModalVisible(false);
          router.push({ pathname: '/(app)/sos-record', params: { groupId, groupName } });
        }
      }
    ]);
  };

  const initials = getInitials(profile?.display_name ?? '');
  const firstName = profile?.display_name?.split(' ')[0] ?? 'amig@';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={groupsLoading} onRefresh={loadGroups} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerBg} />
          <View style={styles.headerCircle1} />
          <View style={styles.headerCircle2} />

          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingSmall}>{greeting},</Text>
              <Text style={styles.greetingName} numberOfLines={1}>{firstName} 👋</Text>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.batteryChip}>
                <Text style={styles.batteryChipText}>
                  {battery.isCharging ? '⚡' : '🔋'} {battery.level ?? '--'}%
                </Text>
              </View>
              <Pressable
                style={styles.avatarBtn}
                onPress={() => router.push('/(app)/profile')}
                hitSlop={8}
              >
                {profile?.avatar_url
                  ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                  : <Text style={styles.avatarInitials} numberOfLines={1} adjustsFontSizeToFit>{initials || '?'}</Text>
                }
                <View style={[styles.avatarStatus, { backgroundColor: isTracking ? Colors.accent : '#A8A29E' }]} />
              </Pressable>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipNum}>{groups.length}</Text>
              <Text style={styles.statChipLabel}>Grupos</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: isTracking ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.15)' }]}>
              <Text style={styles.statChipNum}>{isTracking ? '🟢' : '⚫'}</Text>
              <Text style={styles.statChipLabel}>GPS</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipNum}>{groups.reduce((_, g) => _, 0) || '—'}</Text>
              <Text style={styles.statChipLabel}>En línea</Text>
            </View>
          </View>
        </View>

        {/* ── BANNER SOS ACTIVO ── */}
        {myActiveSOS && (
          <Pressable
            style={styles.sosBanner}
            onPress={() => router.push({
              pathname: '/(app)/sos-active',
              params: { alertId: myActiveSOS.alertId, groupId: myActiveSOS.groupId, groupName: myActiveSOS.groupName }
            })}
          >
            <View style={styles.sosBannerDot} />
            <Text style={styles.sosBannerIcon}>🆘</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sosBannerTitle}>SOS activo — {myActiveSOS.groupName}</Text>
              <Text style={styles.sosBannerSub}>Toca para cancelar si ya estás a salvo</Text>
            </View>
            <Text style={styles.sosBannerArrow}>›</Text>
          </Pressable>
        )}

        {/* ── AVISO PERMISOS ── */}
        {!permissions?.background && !initializing && (
          <Pressable style={styles.permBanner} onPress={() => router.push('/(app)/permissions')}>
            <Text style={styles.permBannerIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.permBannerTitle}>Permisos de ubicación requeridos</Text>
              <Text style={styles.permBannerSub}>Toca para activar el acceso en segundo plano</Text>
            </View>
            <View style={styles.permBannerBtn}>
              <Text style={styles.permBannerBtnText}>Activar</Text>
            </View>
          </Pressable>
        )}

        {/* ── TRACKER CARD ── */}
        <View style={[styles.trackerCard, isTracking && styles.trackerCardOn]}>
          <View style={styles.trackerLeft}>
            <View style={[styles.trackerIconWrap, isTracking && styles.trackerIconWrapOn]}>
              <Text style={styles.trackerEmoji}>{isTracking ? '📡' : '📵'}</Text>
            </View>
            <View>
              <Text style={[styles.trackerTitle, isTracking && { color: Colors.primaryDark }]}>
                {isTracking ? 'Compartiendo ubicación' : 'Ubicación pausada'}
              </Text>
              <Text style={styles.trackerSub}>
                {isTracking ? 'Tu familia puede verte ahora' : 'Activa para aparecer en el mapa'}
              </Text>
            </View>
          </View>
          {initializing
            ? <ActivityIndicator color={Colors.primary} />
            : <Switch
                value={isTracking}
                onValueChange={handleToggle}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
                ios_backgroundColor={Colors.border}
              />
          }
        </View>

        {/* ── SECCIÓN: EMERGENCIA ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>EMERGENCIA</Text>
        </View>
        <View style={styles.sosCard}>
          <View style={styles.sosCardTop}>
            <View>
              <Text style={styles.sosCardTitle}>Botón SOS</Text>
              <Text style={styles.sosCardSub}>Mantén 3 seg · Graba video · Alerta inmediata</Text>
            </View>
            <View style={styles.sosBadge}>
              <Text style={styles.sosBadgeText}>SOS</Text>
            </View>
          </View>
          <View style={styles.sosCenter}>
            <SOSButton onActivate={handleSOS} disabled={groups.length === 0} />
          </View>
          {groups.length === 0 && (
            <Text style={styles.sosHint}>Únete a un grupo familiar para activar el SOS</Text>
          )}
        </View>

        {/* ── SECCIÓN: ACCIONES ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>ACCIONES RÁPIDAS</Text>
        </View>
        <View style={styles.quickGrid}>
          <Pressable style={styles.quickCard} onPress={() => router.push('/(app)/group/create')}>
            <View style={[styles.quickIcon, { backgroundColor: Colors.primaryLight }]}>
              <Text style={styles.quickEmoji}>➕</Text>
            </View>
            <Text style={styles.quickTitle}>Crear grupo</Text>
            <Text style={styles.quickSub}>Invita a tu familia</Text>
          </Pressable>
          <Pressable style={styles.quickCard} onPress={() => router.push('/(app)/group/join')}>
            <View style={[styles.quickIcon, { backgroundColor: '#EDE9FE' }]}>
              <Text style={styles.quickEmoji}>🔗</Text>
            </View>
            <Text style={styles.quickTitle}>Unirse</Text>
            <Text style={styles.quickSub}>Con código</Text>
          </Pressable>
          <Pressable style={styles.quickCard} onPress={() => {
            if (groups.length === 1) router.push({ pathname: '/(app)/settings/geofences', params: { groupId: groups[0].id, groupName: groups[0].name } });
            else if (groups.length > 1) Alert.alert('¿Para qué grupo?', 'Abre el grupo y toca "Zonas seguras".');
            else Alert.alert('Sin grupos', 'Únete a un grupo primero.');
          }}>
            <View style={[styles.quickIcon, { backgroundColor: '#ECFDF5' }]}>
              <Text style={styles.quickEmoji}>📍</Text>
            </View>
            <Text style={styles.quickTitle}>Zonas</Text>
            <Text style={styles.quickSub}>Lugares seguros</Text>
          </Pressable>
        </View>

        {/* Segunda fila de acciones */}
        <View style={styles.miniGrid}>
          <Pressable style={styles.miniCard} onPress={() => router.push('/(app)/history')}>
            <Text style={styles.miniEmoji}>🗺️</Text>
            <Text style={styles.miniTitle}>Historial</Text>
          </Pressable>
          <Pressable style={styles.miniCard} onPress={() => router.push('/(app)/settings/share-location')}>
            <Text style={styles.miniEmoji}>📤</Text>
            <Text style={styles.miniTitle}>Compartir</Text>
          </Pressable>
          <Pressable style={styles.miniCard} onPress={() => router.push('/(app)/settings/invisible-mode')}>
            <Text style={styles.miniEmoji}>👁️</Text>
            <Text style={styles.miniTitle}>Invisible</Text>
          </Pressable>
          <Pressable style={styles.miniCard} onPress={() => router.push('/(app)/settings/travel-mode')}>
            <Text style={styles.miniEmoji}>✈️</Text>
            <Text style={styles.miniTitle}>Modo viaje</Text>
          </Pressable>
        </View>

        {/* ── SECCIÓN: GRUPOS ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>MIS GRUPOS</Text>
          {groups.length > 0 && (
            <Pressable onPress={() => router.push('/(app)/group/create')}>
              <Text style={styles.sectionAction}>+ Nuevo</Text>
            </Pressable>
          )}
        </View>

        {groupsLoading && groups.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : groups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.emptyTitle}>Sin grupos todavía</Text>
            <Text style={styles.emptyBody}>Crea un grupo familiar o únete con un código de invitación</Text>
            <View style={styles.emptyActions}>
              <Pressable style={styles.emptyBtn} onPress={() => router.push('/(app)/group/create')}>
                <Text style={styles.emptyBtnText}>Crear grupo</Text>
              </Pressable>
              <Pressable style={[styles.emptyBtn, styles.emptyBtnGhost]} onPress={() => router.push('/(app)/group/join')}>
                <Text style={[styles.emptyBtnText, { color: Colors.primary }]}>Unirme con código</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          groups.map(group => (
            <Pressable
              key={group.id}
              style={styles.groupRow}
              onPress={() => router.push({ pathname: '/(app)/group/[id]', params: { id: group.id } })}
            >
              <View style={[styles.groupAvatar, { backgroundColor: (group.color ?? Colors.primary) + '22' }]}>
                <Text style={styles.groupAvatarEmoji}>{group.emoji}</Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupSub}>Toca para ver el mapa y miembros</Text>
              </View>
              <View style={styles.groupChevron}>
                <Text style={styles.groupChevronText}>›</Text>
              </View>
            </Pressable>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal selección de grupo para SOS */}
      <Modal visible={sosModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>¿A qué grupo?</Text>
            <Text style={styles.modalSub}>Selecciona el grupo que recibirá la alerta de emergencia</Text>
            {groups.map(group => (
              <Pressable
                key={group.id}
                style={styles.modalGroupRow}
                onPress={() => { setSosModalVisible(false); confirmSOS(group.id, group.name); }}
              >
                <Text style={{ fontSize: 26 }}>{group.emoji}</Text>
                <Text style={styles.modalGroupName}>{group.name}</Text>
                <Text style={{ color: Colors.danger, fontSize: 22 }}>›</Text>
              </Pressable>
            ))}
            <Button title="Cancelar" variant="ghost" fullWidth onPress={() => setSosModalVisible(false)} style={{ marginTop: Spacing.sm }} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: Spacing.xxxl },

  // ── HEADER ──
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 56,
    paddingBottom: Spacing.xxl,
    position: 'relative',
    overflow: 'hidden',
  },
  headerBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1C1917',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  headerCircle1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: Colors.primary, opacity: 0.12,
    top: -60, right: -40,
  },
  headerCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.primaryMid, opacity: 0.08,
    top: 30, right: 70,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  headerLeft: { flex: 1 },
  greetingSmall: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  greetingName: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  batteryChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5,
  },
  batteryChipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  avatarBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  avatarInitials: { color: '#fff', fontWeight: '800', fontSize: 17 },
  avatarStatus: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 2, borderColor: '#1C1917',
  },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statChip: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.lg, paddingVertical: 10,
    alignItems: 'center', gap: 2,
  },
  statChipNum: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statChipLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },

  // ── BANNERS ──
  sosBanner: {
    marginHorizontal: Spacing.xl, marginTop: Spacing.lg,
    backgroundColor: '#7F1D1D',
    borderRadius: Radius.xl, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderColor: '#991B1B',
    ...Shadows.floating,
  },
  sosBannerDot: {
    position: 'absolute', top: 12, right: 12,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FCA5A5',
  },
  sosBannerIcon: { fontSize: 26 },
  sosBannerTitle: { fontSize: 14, fontWeight: '800', color: '#FECACA' },
  sosBannerSub: { fontSize: 12, color: 'rgba(254,202,202,0.7)', marginTop: 2 },
  sosBannerArrow: { fontSize: 22, color: '#FECACA' },

  permBanner: {
    marginHorizontal: Spacing.xl, marginTop: Spacing.md,
    backgroundColor: '#FFF7ED', borderRadius: Radius.xl, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderColor: '#FED7AA',
  },
  permBannerIcon: { fontSize: 20 },
  permBannerTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  permBannerSub: { fontSize: 12, color: '#B45309', marginTop: 1 },
  permBannerBtn: { backgroundColor: Colors.primary, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  permBannerBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  // ── TRACKER ──
  trackerCard: {
    marginHorizontal: Spacing.xl, marginTop: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.border,
    ...Shadows.card,
  },
  trackerCardOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  trackerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  trackerIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  trackerIconWrapOn: { backgroundColor: Colors.primary },
  trackerEmoji: { fontSize: 26 },
  trackerTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  trackerSub: { fontSize: 12, color: Colors.textSoft, marginTop: 2 },

  // ── SECTION ──
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: Spacing.xl, marginTop: Spacing.xxl, marginBottom: Spacing.md,
  },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: Colors.textMuted },
  sectionAction: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // ── SOS CARD ──
  sosCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor: '#FFF1F2',
    borderRadius: Radius.xl, padding: Spacing.xl,
    borderWidth: 1.5, borderColor: '#FFD5D5',
  },
  sosCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: Spacing.lg,
  },
  sosCardTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  sosCardSub: { fontSize: 12, color: '#F87171', marginTop: 3 },
  sosBadge: {
    backgroundColor: Colors.danger, borderRadius: Radius.pill,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  sosBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  sosCenter: { alignItems: 'center', paddingVertical: Spacing.md },
  sosHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },

  // ── QUICK GRID ──
  quickGrid: { flexDirection: 'row', gap: Spacing.md, marginHorizontal: Spacing.xl },
  quickCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, ...Shadows.card,
  },
  quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  quickEmoji: { fontSize: 26 },
  quickTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  quickSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },

  // ── MINI GRID ──
  miniGrid: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.xl, marginTop: Spacing.sm },
  miniCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  miniEmoji: { fontSize: 22 },
  miniTitle: { fontSize: 11, fontWeight: '700', color: Colors.textSoft },

  // ── GRUPOS ──
  emptyCard: {
    marginHorizontal: Spacing.xl, backgroundColor: Colors.surface,
    borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 52, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  emptyBody: { fontSize: 14, color: Colors.textSoft, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg },
  emptyActions: { flexDirection: 'row', gap: Spacing.sm },
  emptyBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg, paddingVertical: 10, ...Shadows.button,
  },
  emptyBtnGhost: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.primary },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  groupRow: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, ...Shadows.card,
    borderWidth: 1, borderColor: Colors.border,
  },
  groupAvatar: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  groupAvatarEmoji: { fontSize: 28 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  groupSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  groupChevron: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  groupChevronText: { fontSize: 20, color: Colors.primary, fontWeight: '700' },

  // ── MODAL SOS ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.xl, gap: Spacing.md, paddingBottom: 36,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.danger, textAlign: 'center' },
  modalSub: { fontSize: 14, color: Colors.textSoft, textAlign: 'center' },
  modalGroupRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.md,
  },
  modalGroupName: { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
});
