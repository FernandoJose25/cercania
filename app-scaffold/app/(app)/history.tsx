import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '../../src/lib/theme';
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
  color: string;
  points: HistoryPoint[];
}

const MEMBER_COLORS = ['#F59E0B', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#F97316'];
type RangeMode = 'day' | '7d' | '30d';

const DAY_OPTIONS = [
  { label: 'Hoy', value: 0 },
  { label: 'Ayer', value: 1 },
  { label: 'Hace 2 días', value: 2 },
  { label: 'Hace 3 días', value: 3 },
];

const RANGE_OPTIONS: { label: string; value: RangeMode }[] = [
  { label: 'Hoy', value: 'day' },
  { label: '7 días', value: '7d' },
  { label: '30 días', value: '30d' },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function formatSpeed(mps: number | null): string {
  if (mps == null || mps < 0.5) return 'Estático';
  return `${Math.round(mps * 3.6)} km/h`;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
}

function TimelinePoint({ point, isFirst, isLast, color }: {
  point: HistoryPoint; isFirst: boolean; isLast: boolean; color: string;
}) {
  const isMoving = point.speed != null && point.speed >= 0.5;
  return (
    <View style={tl.row}>
      {/* Columna hora */}
      <View style={tl.timeCol}>
        <Text style={tl.time}>{formatTime(point.recorded_at)}</Text>
      </View>

      {/* Línea vertical */}
      <View style={tl.lineCol}>
        <View style={[tl.dot, { borderColor: color, backgroundColor: isFirst ? color : isLast ? color : '#292524' }]} />
        {!isLast && <View style={[tl.line, { backgroundColor: color + '44' }]} />}
      </View>

      {/* Contenido */}
      <View style={tl.content}>
        <View style={tl.contentRow}>
          <Ionicons
            name={isMoving ? 'navigate-outline' : 'location-outline'}
            size={13}
            color={color}
          />
          <Text style={tl.coords}>
            {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
          </Text>
        </View>
        <View style={tl.metaRow}>
          <View style={tl.metaChip}>
            <Ionicons name="speedometer-outline" size={11} color="#57534E" />
            <Text style={tl.metaText}>{formatSpeed(point.speed)}</Text>
          </View>
          {point.battery_level != null && (
            <View style={tl.metaChip}>
              <Ionicons name="battery-half-outline" size={11} color="#57534E" />
              <Text style={tl.metaText}>{point.battery_level}%</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const tl = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 0 },
  timeCol: { width: 52, paddingTop: 3, alignItems: 'flex-end', paddingRight: 10 },
  time: { fontSize: 11, fontWeight: '600', color: '#57534E' },
  lineCol: { width: 20, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, zIndex: 1 },
  line: { width: 2, flex: 1, minHeight: 28, marginTop: 2 },
  content: { flex: 1, paddingLeft: 10, paddingBottom: 18 },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  coords: { fontSize: 12, color: '#A8A29E', fontWeight: '600', flex: 1 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#57534E' },
});

// ─── Pantalla principal ──────────────────────────────────────────────────────
export default function HistoryScreen() {
  const { user } = useAuth();
  const { groups } = useGroups();
  const insets = useSafeAreaInsets();
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [rangeMode, setRangeMode] = useState<RangeMode>('7d');
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
      const now = new Date();
      let dayStart: Date;
      let dayEnd: Date;
      if (rangeMode === '7d') {
        dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        dayStart = new Date(dayEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (rangeMode === '30d') {
        dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        dayStart = new Date(dayEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - selectedDayOffset);
        dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      }

      const { data: membersData } = await sb
        .from('group_members')
        .select('user_id, profiles(display_name)')
        .eq('group_id', selectedGroup.id);

      if (!membersData?.length) { setMembers([]); return; }

      const histories: MemberHistory[] = await Promise.all(
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
            color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
            points: points ?? [],
          };
        })
      );

      setMembers(histories);
      setSelectedMemberIdx(0);
    } catch (e: any) {
      console.warn('[History]', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGroup, selectedDayOffset, rangeMode]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const currentMember = members[selectedMemberIdx] ?? null;
  const totalPoints = currentMember?.points.length ?? 0;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#FAFAF9" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Historial</Text>
          <Text style={styles.headerSub}>Recorridos · {rangeMode === '7d' ? 'Últimos 7 días' : rangeMode === '30d' ? 'Últimos 30 días' : 'Hoy'}</Text>
        </View>
        {totalPoints > 0 && (
          <View style={styles.countPill}>
            <Text style={styles.countText}>{totalPoints}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadHistory(); }}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Selector de grupo */}
        {groups.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {groups.map((g, i) => (
              <Pressable
                key={g.id}
                style={[styles.chip, i === selectedGroupIdx && styles.chipActive]}
                onPress={() => { setSelectedGroupIdx(i); setSelectedMemberIdx(0); }}
              >
                <Text style={styles.chipEmoji}>{g.emoji}</Text>
                <Text style={[styles.chipText, i === selectedGroupIdx && styles.chipTextActive]}>{g.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Selector de rango */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {RANGE_OPTIONS.map(opt => (
            <Pressable
              key={opt.value}
              style={[styles.chip, opt.value === rangeMode && styles.chipActive]}
              onPress={() => setRangeMode(opt.value)}
            >
              <Text style={[styles.chipText, opt.value === rangeMode && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Selector de día (solo si modo día) */}
        {rangeMode === 'day' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {DAY_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                style={[styles.chip, opt.value === selectedDayOffset && styles.chipActive]}
                onPress={() => setSelectedDayOffset(opt.value)}
              >
                <Text style={[styles.chipText, opt.value === selectedDayOffset && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Sin grupo */}
        {!selectedGroup ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people-outline" size={40} color="#57534E" />
            </View>
            <Text style={styles.emptyTitle}>Sin grupos</Text>
            <Text style={styles.emptyText}>Crea o únete a un grupo para ver el historial</Text>
          </View>
        ) : loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Cargando recorridos...</Text>
          </View>
        ) : (
          <>
            {/* Selector de miembro */}
            {members.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {members.map((m, i) => (
                  <Pressable
                    key={m.userId}
                    style={[styles.memberChip, i === selectedMemberIdx && { backgroundColor: m.color + '22', borderColor: m.color }]}
                    onPress={() => setSelectedMemberIdx(i)}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: m.color + '33' }]}>
                      <Text style={[styles.memberAvatarText, { color: m.color }]}>{getInitials(m.name)}</Text>
                    </View>
                    <Text style={[styles.chipText, i === selectedMemberIdx && { color: m.color, fontWeight: '700' }]}>
                      {m.name.split(' ')[0]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* Stats del miembro seleccionado */}
            {currentMember && totalPoints > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Ionicons name="location" size={20} color={currentMember.color} />
                  <Text style={[styles.statNum, { color: currentMember.color }]}>{totalPoints}</Text>
                  <Text style={styles.statLabel}>Puntos GPS</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="time-outline" size={20} color="#78716C" />
                  <Text style={styles.statNum}>{formatTime(currentMember.points[0].recorded_at)}</Text>
                  <Text style={styles.statLabel}>Inicio</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="flag-outline" size={20} color="#78716C" />
                  <Text style={styles.statNum}>{formatTime(currentMember.points[totalPoints - 1].recorded_at)}</Text>
                  <Text style={styles.statLabel}>Último</Text>
                </View>
              </View>
            )}

            {/* Timeline */}
            {currentMember && totalPoints > 0 ? (
              <View style={styles.timelineCard}>
                <View style={styles.timelineHeader}>
                  <View style={[styles.timelineAvatarSmall, { backgroundColor: currentMember.color + '22' }]}>
                    <Text style={[styles.timelineAvatarText, { color: currentMember.color }]}>
                      {getInitials(currentMember.name)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.timelineTitle}>{currentMember.name}</Text>
                    <Text style={styles.timelineSub}>{totalPoints} puntos · {DATE_OPTIONS.find(d => d.value === selectedDayOffset)?.label}</Text>
                  </View>
                </View>
                <View style={styles.timelineDivider} />
                {currentMember.points.map((p, i) => (
                  <TimelinePoint
                    key={i}
                    point={p}
                    isFirst={i === 0}
                    isLast={i === totalPoints - 1}
                    color={currentMember.color}
                  />
                ))}
              </View>
            ) : currentMember ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="map-outline" size={40} color="#57534E" />
                </View>
                <Text style={styles.emptyTitle}>Sin recorrido</Text>
                <Text style={styles.emptyText}>
                  Sin ubicaciones registradas en este período. Activa el rastreador GPS para empezar a registrar tu recorrido.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C0A09' },

  header: {
    backgroundColor: '#1C1917',
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#292524',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FAFAF9' },
  headerSub: { fontSize: 12, color: '#78716C', marginTop: 1 },
  countPill: {
    backgroundColor: '#F59E0B22', borderRadius: Radius.pill,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#F59E0B44',
  },
  countText: { fontSize: 13, fontWeight: '800', color: '#F59E0B' },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },

  chipRow: { paddingHorizontal: 0, gap: 8, paddingBottom: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1C1917', borderRadius: Radius.pill,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#292524',
  },
  chipActive: { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 13, fontWeight: '600', color: '#78716C' },
  chipTextActive: { color: '#F59E0B' },

  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1C1917', borderRadius: Radius.pill,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.5, borderColor: '#292524',
  },
  memberAvatar: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 9, fontWeight: '800' },

  loadingWrap: { paddingTop: 48, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: '#57534E' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#1C1917', borderRadius: Radius.lg,
    padding: 14, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#292524',
  },
  statNum: { fontSize: 14, fontWeight: '800', color: '#FAFAF9' },
  statLabel: { fontSize: 10, color: '#57534E', textAlign: 'center' },

  timelineCard: {
    backgroundColor: '#1C1917', borderRadius: Radius.xl,
    padding: 16, borderWidth: 1, borderColor: '#292524',
  },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  timelineAvatarSmall: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineAvatarText: { fontSize: 13, fontWeight: '800' },
  timelineTitle: { fontSize: 15, fontWeight: '700', color: '#FAFAF9' },
  timelineSub: { fontSize: 12, color: '#78716C', marginTop: 1 },
  timelineDivider: { height: 1, backgroundColor: '#292524', marginBottom: 14 },

  emptyCard: {
    backgroundColor: '#1C1917', borderRadius: Radius.xl,
    padding: 36, alignItems: 'center',
    borderWidth: 1, borderColor: '#292524', borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#FAFAF9', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#78716C', textAlign: 'center', lineHeight: 20 },
});
