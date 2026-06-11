// 📁 cercania/app-scaffold/app/(app)/history.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../src/lib/theme';
import { getSupabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/store/auth';
import { useGroups } from '../../src/store/groups';

interface HistoryPoint {
  latitude: number;
  longitude: number;
  recorded_at: string;
  speed: number | null;
  battery_level: number | null;
}

interface MemberHistory {
  userId: string;
  name: string;
  emoji: string;
  color: string;
  points: HistoryPoint[];
}

const MEMBER_COLORS = ['#F59E0B', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#F97316'];

const DATE_OPTIONS: { label: string; value: number }[] = [
  { label: 'Hoy', value: 0 },
  { label: 'Ayer', value: 1 },
  { label: 'Hace 2 días', value: 2 },
  { label: 'Hace 3 días', value: 3 },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function formatSpeed(mps: number | null): string {
  if (mps == null || mps < 0.5) return 'Estático';
  const kmh = Math.round(mps * 3.6);
  return `${kmh} km/h`;
}

function TimelinePoint({ point, isFirst, isLast }: {
  point: HistoryPoint; isFirst: boolean; isLast: boolean
}) {
  return (
    <View style={tlStyles.row}>
      <View style={tlStyles.timeCol}>
        <Text style={tlStyles.time}>{formatTime(point.recorded_at)}</Text>
      </View>
      <View style={tlStyles.lineCol}>
        <View style={[tlStyles.dot, isFirst && tlStyles.dotFirst, isLast && tlStyles.dotLast]} />
        {!isLast && <View style={tlStyles.line} />}
      </View>
      <View style={tlStyles.contentCol}>
        <Text style={tlStyles.coords}>
          {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
        </Text>
        <View style={tlStyles.metaRow}>
          <Text style={tlStyles.meta}>⚡ {formatSpeed(point.speed)}</Text>
          {point.battery_level != null && (
            <Text style={tlStyles.meta}>🔋 {point.battery_level}%</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const tlStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 4 },
  timeCol: { width: 56, paddingTop: 2, alignItems: 'flex-end', paddingRight: 10 },
  time: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  lineCol: { width: 20, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border, borderWidth: 2, borderColor: Colors.primary },
  dotFirst: { backgroundColor: Colors.accent, borderColor: Colors.accentDark },
  dotLast: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  line: { width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 2, minHeight: 24 },
  contentCol: { flex: 1, paddingLeft: 10, paddingBottom: 16 },
  coords: { fontSize: 12, color: Colors.text, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 3 },
  meta: { fontSize: 11, color: Colors.textMuted },
});

export default function HistoryScreen() {
  const { user } = useAuth();
  const { groups } = useGroups();
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);
  const [members, setMembers] = useState<MemberHistory[]>([]);
  const [selectedMemberIdx, setSelectedMemberIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const selectedGroup = groups[selectedGroupIdx] ?? null;

  const loadHistory = useCallback(async () => {
    if (!selectedGroup) return;
    setLoading(true);
    try {
      const sb = await getSupabase();

      // Calcular rango del día seleccionado
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - selectedDayOffset);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      // Obtener miembros del grupo
      const { data: membersData } = await sb
        .from('group_members')
        .select('user_id, profiles(display_name)')
        .eq('group_id', selectedGroup.id);

      if (!membersData?.length) { setMembers([]); return; }

      const memberHistories: MemberHistory[] = await Promise.all(
        membersData.map(async (m: any, idx: number) => {
          const { data: points } = await sb
            .from('location_history')
            .select('latitude, longitude, recorded_at, speed, battery_level')
            .eq('user_id', m.user_id)
            .gte('recorded_at', dayStart.toISOString())
            .lt('recorded_at', dayEnd.toISOString())
            .order('recorded_at', { ascending: true })
            .limit(200);

          return {
            userId: m.user_id,
            name: m.profiles?.display_name ?? 'Miembro',
            emoji: '👤',
            color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
            points: points ?? [],
          };
        })
      );

      setMembers(memberHistories);
      setSelectedMemberIdx(0);
    } catch (e: any) {
      console.warn('[History]', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGroup, selectedDayOffset]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const currentMember = members[selectedMemberIdx] ?? null;
  const totalPoints = currentMember?.points.length ?? 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHistory(); }} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBg} />
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Historial</Text>
        <Text style={styles.headerSub}>Recorridos del día</Text>
      </View>

      {/* Selector de grupo */}
      {groups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          {groups.map((g, i) => (
            <Pressable key={g.id} style={[styles.chip, i === selectedGroupIdx && styles.chipActive]}
              onPress={() => { setSelectedGroupIdx(i); setSelectedMemberIdx(0); }}>
              <Text style={styles.chipEmoji}>{g.emoji}</Text>
              <Text style={[styles.chipText, i === selectedGroupIdx && styles.chipTextActive]}>{g.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Selector de día */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {DATE_OPTIONS.map((opt) => (
          <Pressable key={opt.value} style={[styles.chip, opt.value === selectedDayOffset && styles.chipActive]}
            onPress={() => setSelectedDayOffset(opt.value)}>
            <Text style={[styles.chipText, opt.value === selectedDayOffset && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sin grupo */}
      {!selectedGroup ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.emptyTitle}>Sin grupos</Text>
          <Text style={styles.emptyText}>Crea o únete a un grupo para ver el historial</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Selector de miembro */}
          {members.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
              {members.map((m, i) => (
                <Pressable key={m.userId} style={[styles.memberChip, i === selectedMemberIdx && { backgroundColor: m.color + '22', borderColor: m.color }]}
                  onPress={() => setSelectedMemberIdx(i)}>
                  <View style={[styles.memberDot, { backgroundColor: m.color }]} />
                  <Text style={[styles.chipText, i === selectedMemberIdx && { color: m.color, fontWeight: '700' }]}>{m.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Stats del miembro */}
          {currentMember && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{totalPoints}</Text>
                <Text style={styles.statLabel}>Puntos GPS</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>
                  {totalPoints > 0 ? formatTime(currentMember.points[0].recorded_at) : '--'}
                </Text>
                <Text style={styles.statLabel}>Primera ubicación</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>
                  {totalPoints > 0 ? formatTime(currentMember.points[totalPoints - 1].recorded_at) : '--'}
                </Text>
                <Text style={styles.statLabel}>Última ubicación</Text>
              </View>
            </View>
          )}

          {/* Timeline */}
          {currentMember && totalPoints > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 Recorrido de {currentMember.name}</Text>
              <Text style={styles.cardSub}>{totalPoints} puntos registrados</Text>
              <View style={{ marginTop: Spacing.lg }}>
                {currentMember.points.map((p, i) => (
                  <TimelinePoint
                    key={i}
                    point={p}
                    isFirst={i === 0}
                    isLast={i === totalPoints - 1}
                  />
                ))}
              </View>
            </View>
          ) : currentMember ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyTitle}>Sin recorrido</Text>
              <Text style={styles.emptyText}>
                {currentMember.name} no compartió su ubicación {selectedDayOffset === 0 ? 'hoy' : `hace ${selectedDayOffset} día${selectedDayOffset > 1 ? 's' : ''}`}
              </Text>
            </View>
          ) : null}
        </>
      )}
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
  headerSub: { ...Typography.body, color: Colors.textSoft, marginTop: 4 },

  chipScroll: { marginTop: Spacing.md },
  chipRow: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSoft },
  chipTextActive: { color: Colors.primaryDark },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: Colors.border },
  memberDot: { width: 8, height: 8, borderRadius: 4 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.xl, marginTop: Spacing.lg },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', ...Shadows.card },
  statNum: { fontSize: 15, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },

  card: { marginHorizontal: Spacing.xl, marginTop: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadows.card },
  cardTitle: { ...Typography.h3, color: Colors.text },
  cardSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },

  emptyCard: { marginHorizontal: Spacing.xl, marginTop: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { ...Typography.body, color: Colors.textSoft, textAlign: 'center' },
});
