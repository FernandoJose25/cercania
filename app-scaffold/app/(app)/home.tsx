// 📁 cercania/app-scaffold/app/(app)/home.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable,
  RefreshControl, ScrollView, StyleSheet, Switch, Text, View
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { SOSButton } from '../../src/components/sos/SOSButton';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../src/lib/theme';
import { useAuth } from '../../src/store/auth';
import { useTracking } from '../../src/store/tracking';
import { useGroups } from '../../src/store/groups';
import { useBatteryStatus } from '../../src/hooks/useBatteryStatus';
import { getInitials } from '../../src/utils/format';
import { activateSOS } from '../../src/services/sos.service';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { isTracking, permissions, initializing, enableTracking, disableTracking, init: initTracking } = useTracking();
  const { groups, loading: groupsLoading, loadGroups } = useGroups();
  const battery = useBatteryStatus();
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  useEffect(() => { initTracking(); loadGroups(); }, []);

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
    Alert.alert('¡EMERGENCIA!', `Enviar alerta SOS al grupo "${groupName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'ACTIVAR SOS', style: 'destructive', onPress: () => sendSOS(groupId, groupName) }
    ]);
  };

  const sendSOS = async (groupId: string, groupName: string) => {
    setSosLoading(true); setSosModalVisible(false);
    try {
      const result = await activateSOS(groupId);
      router.push({ pathname: '/(app)/sos-active', params: { alertId: result.alert_id, groupName } });
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSosLoading(false); }
  };

  const initials = getInitials(profile?.display_name ?? '');
  const firstName = profile?.display_name?.split(' ')[0] ?? 'amig@';

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={groupsLoading} onRefresh={loadGroups} />}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBg} />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>¡Hola, {firstName}! 👋</Text>
              <Text style={styles.greetingSub}>
                {isTracking ? '📡 Rastreo activo' : '📵 Rastreo pausado'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {/* Batería */}
              <View style={styles.batteryPill}>
                <Text style={styles.batteryText}>{battery.isCharging ? '⚡' : '🔋'} {battery.level ?? '--'}%</Text>
              </View>
              {/* Avatar */}
              <Pressable style={styles.avatar} onPress={() => router.push('/(app)/profile')}>
                <Text style={styles.avatarText}>{initials || '?'}</Text>
                <View style={styles.avatarDot} />
              </Pressable>
            </View>
          </View>

          {/* Stats rápidos */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{groups.length}</Text>
              <Text style={styles.statLabel}>Grupos</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isTracking ? Colors.accentLight : Colors.surfaceAlt }]}>
              <Text style={styles.statNum}>{isTracking ? '🟢' : '🔴'}</Text>
              <Text style={styles.statLabel}>Estado</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{battery.level ?? '--'}%</Text>
              <Text style={styles.statLabel}>Batería</Text>
            </View>
          </View>
        </View>

        {/* Tracker card */}
        <View style={[styles.trackerCard, isTracking && styles.trackerCardActive]}>
          <View style={styles.trackerLeft}>
            <View style={[styles.trackerIconBox, isTracking && styles.trackerIconBoxActive]}>
              <Text style={styles.trackerIcon}>{isTracking ? '📡' : '📵'}</Text>
            </View>
            <View>
              <Text style={styles.trackerTitle}>{isTracking ? 'Rastreo activo' : 'Rastreo pausado'}</Text>
              <Text style={styles.trackerSub}>
                {isTracking ? 'Tu familia puede verte ahora' : 'Activa para compartir ubicación'}
              </Text>
            </View>
          </View>
          {initializing
            ? <ActivityIndicator color={Colors.primary} />
            : <Switch value={isTracking} onValueChange={handleToggle}
              trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#fff" />
          }
        </View>

        {!permissions?.background && !initializing && (
          <View style={styles.permCard}>
            <Text style={styles.permIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.permTitle}>Permisos requeridos</Text>
              <Text style={styles.permText}>Activa la ubicación para compartirla con tu familia</Text>
            </View>
            <Pressable style={styles.permBtn} onPress={() => router.push('/(app)/permissions')}>
              <Text style={styles.permBtnText}>Activar</Text>
            </Pressable>
          </View>
        )}

        {/* SOS */}
        <View style={styles.sosCard}>
          <View style={styles.sosHeader}>
            <View>
              <Text style={styles.sosTitle}>Botón de emergencia</Text>
              <Text style={styles.sosSub}>Mantén 3 segundos para activar</Text>
            </View>
            <View style={styles.sosBadge}>
              <Text style={styles.sosBadgeText}>SOS</Text>
            </View>
          </View>
          <View style={styles.sosCenter}>
            {sosLoading
              ? <ActivityIndicator size="large" color={Colors.danger} />
              : <SOSButton onActivate={handleSOS} disabled={groups.length === 0} />
            }
          </View>
          {groups.length === 0 && (
            <Text style={styles.sosDisabled}>Únete a un grupo para activar el SOS</Text>
          )}
        </View>

        {/* Acciones grupos */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(app)/group/create')}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>➕</Text>
            </View>
            <Text style={styles.actionTitle}>Crear grupo</Text>
            <Text style={styles.actionSub}>Invita a tu familia</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(app)/group/join')}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.accentLight }]}>
              <Text style={styles.actionEmoji}>🔗</Text>
            </View>
            <Text style={styles.actionTitle}>Unirse</Text>
            <Text style={styles.actionSub}>Con código</Text>
          </Pressable>
        </View>

        {/* Grupos */}
        <Text style={styles.sectionTitle}>Mis grupos</Text>
        {groupsLoading && groups.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : groups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.emptyTitle}>Sin grupos aún</Text>
            <Text style={styles.emptyText}>Crea un grupo o únete con un código de invitación</Text>
          </View>
        ) : (
          groups.map(group => (
            <Pressable key={group.id} style={styles.groupCard}
              onPress={() => router.push({ pathname: '/(app)/group/[id]', params: { id: group.id } })}>
              <View style={[styles.groupEmoji, { backgroundColor: (group.color ?? Colors.primary) + '22' }]}>
                <Text style={styles.groupEmojiText}>{group.emoji}</Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupSub}>Ver mapa en tiempo real</Text>
              </View>
              <View style={styles.groupArrow}>
                <Text style={styles.groupArrowText}>›</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Modal SOS grupo */}
      <Modal visible={sosModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>¿A qué grupo?</Text>
            <Text style={styles.modalSub}>Selecciona el grupo que recibirá la alerta SOS</Text>
            {groups.map(group => (
              <Pressable key={group.id} style={styles.groupSOSOption}
                onPress={() => { setSosModalVisible(false); confirmSOS(group.id, group.name); }}>
                <Text style={styles.groupSOSEmoji}>{group.emoji}</Text>
                <Text style={styles.groupSOSName}>{group.name}</Text>
                <Text style={{ color: Colors.danger, fontSize: 22 }}>›</Text>
              </Pressable>
            ))}
            <Button title="Cancelar" variant="ghost" fullWidth onPress={() => setSosModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: Spacing.xxxl },

  header: { paddingHorizontal: Spacing.xl, paddingTop: 52, paddingBottom: Spacing.xxl, position: 'relative', overflow: 'hidden' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bgAlt, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  greeting: { fontSize: 24, fontWeight: '900', color: Colors.text },
  greetingSub: { ...Typography.caption, color: Colors.textSoft, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  batteryPill: { backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5, ...Shadows.card },
  batteryText: { ...Typography.small, fontWeight: '700', color: Colors.text },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.button },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  avatarDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent, borderWidth: 2, borderColor: Colors.surface },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', ...Shadows.card },
  statNum: { fontSize: 18, fontWeight: '800', color: Colors.text },
  statLabel: { ...Typography.small, marginTop: 2 },

  trackerCard: { marginHorizontal: Spacing.xl, marginTop: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.border, ...Shadows.card },
  trackerCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  trackerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  trackerIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  trackerIconBoxActive: { backgroundColor: Colors.primary },
  trackerIcon: { fontSize: 24 },
  trackerTitle: { ...Typography.bodyBold, color: Colors.text },
  trackerSub: { ...Typography.caption, color: Colors.textSoft, marginTop: 1 },

  permCard: { marginHorizontal: Spacing.xl, marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: '#FFF7ED', borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, borderColor: '#FED7AA' },
  permIcon: { fontSize: 22 },
  permTitle: { ...Typography.bodyBold, color: '#92400E' },
  permText: { ...Typography.caption, color: '#B45309' },
  permBtn: { backgroundColor: Colors.warning, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  permBtnText: { ...Typography.small, fontWeight: '700', color: '#fff' },

  sosCard: { marginHorizontal: Spacing.xl, marginTop: Spacing.lg, backgroundColor: '#FFF1F2', borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1.5, borderColor: '#FFD5D5' },
  sosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  sosTitle: { ...Typography.h3, color: Colors.danger },
  sosSub: { ...Typography.caption, color: '#F87171', marginTop: 2 },
  sosBadge: { backgroundColor: Colors.danger, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  sosBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  sosCenter: { alignItems: 'center', paddingVertical: Spacing.md },
  sosDisabled: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },

  actionsRow: { flexDirection: 'row', gap: Spacing.md, marginHorizontal: Spacing.xl, marginTop: Spacing.lg },
  actionCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, ...Shadows.card },
  actionIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  actionEmoji: { fontSize: 26 },
  actionTitle: { ...Typography.bodyBold, color: Colors.text },
  actionSub: { ...Typography.small, marginTop: 2 },

  sectionTitle: { ...Typography.h3, color: Colors.text, marginHorizontal: Spacing.xl, marginTop: Spacing.xl, marginBottom: Spacing.md },

  emptyCard: { marginHorizontal: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
  emptyIcon: { fontSize: 52, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { ...Typography.body, color: Colors.textSoft, textAlign: 'center' },

  groupCard: { marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadows.card },
  groupEmoji: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  groupEmojiText: { fontSize: 28 },
  groupInfo: { flex: 1 },
  groupName: { ...Typography.bodyBold, color: Colors.text },
  groupSub: { ...Typography.caption, marginTop: 2 },
  groupArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  groupArrowText: { fontSize: 20, color: Colors.primary, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, gap: Spacing.md },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { ...Typography.h2, color: Colors.danger, textAlign: 'center' },
  modalSub: { ...Typography.body, color: Colors.textSoft, textAlign: 'center' },
  groupSOSOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.md },
  groupSOSEmoji: { fontSize: 28 },
  groupSOSName: { ...Typography.bodyBold, color: Colors.text, flex: 1 },
});