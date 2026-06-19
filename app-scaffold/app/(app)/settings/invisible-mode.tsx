import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '../../../src/lib/theme';
import { getSupabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/store/auth';

const DURATION_OPTIONS = [
  { label: '30 minutos', hours: 0.5, icon: 'time-outline' as const, desc: 'Ideal para una reunión corta' },
  { label: '1 hora', hours: 1, icon: 'time-outline' as const, desc: 'Para una cita o descanso' },
  { label: '3 horas', hours: 3, icon: 'moon-outline' as const, desc: 'Para una tarde personal' },
  { label: '8 horas', hours: 8, icon: 'bed-outline' as const, desc: 'Para todo el día' },
  { label: 'Sin límite', hours: 999, icon: 'lock-closed-outline' as const, desc: 'Hasta que lo desactives tú' },
];

export default function InvisibleModeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isInvisible, setIsInvisible] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHours, setSelectedHours] = useState(1);
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const sb = await getSupabase();
      const { data } = await sb
        .from('invisible_mode')
        .select('expires_at')
        .eq('user_id', user?.id)
        .single();
      if (data) {
        const expires = new Date(data.expires_at);
        if (expires > new Date()) {
          setIsInvisible(true);
          setExpiresAt(expires);
        } else {
          await sb.from('invisible_mode').delete().eq('user_id', user?.id);
          setIsInvisible(false);
          setExpiresAt(null);
        }
      } else {
        setIsInvisible(false);
        setExpiresAt(null);
      }
    } catch {
      setIsInvisible(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const activate = async () => {
    setSaving(true);
    try {
      const sb = await getSupabase();
      await sb.rpc('set_invisible_mode', { p_hours: selectedHours });
      await loadStatus();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    setSaving(true);
    try {
      const sb = await getSupabase();
      await sb.rpc('disable_invisible_mode');
      setIsInvisible(false);
      setExpiresAt(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const formatExpiry = (date: Date) => {
    const diff = date.getTime() - Date.now();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m restantes`;
    return `${minutes}m restantes`;
  };

  const firstName = user?.user_metadata?.display_name?.split(' ')[0] ?? 'Tú';

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#FAFAF9" />
        </Pressable>
        <Text style={styles.headerTitle}>Modo invisible</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : (
          <>
            {/* Estado actual */}
            <View style={[styles.statusCard, isInvisible ? styles.statusCardInvisible : styles.statusCardVisible]}>
              <View style={[styles.statusIconWrap, isInvisible ? styles.statusIconInvisible : styles.statusIconVisible]}>
                <Ionicons
                  name={isInvisible ? 'eye-off' : 'eye'}
                  size={28}
                  color={isInvisible ? '#A78BFA' : '#F59E0B'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>
                  {isInvisible ? 'Estás invisible' : 'Visible para tu familia'}
                </Text>
                <Text style={styles.statusSub}>
                  {isInvisible
                    ? (expiresAt && expiresAt.getFullYear() < 2099
                      ? formatExpiry(expiresAt)
                      : 'Hasta que lo desactives')
                    : 'Tu familia puede ver tu ubicación en el mapa'
                  }
                </Text>
              </View>
              {isInvisible && (
                <View style={[styles.badge, styles.badgeInvisible]}>
                  <Text style={styles.badgeText}>ACTIVO</Text>
                </View>
              )}
            </View>

            {/* Qué ven los demás */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color="#78716C" style={{ marginTop: 1 }} />
              <Text style={styles.infoText}>
                Cuando estás invisible, tu familia ve{' '}
                <Text style={styles.infoHighlight}>"{firstName} pausó su ubicación"</Text>
                {' '}— saben que lo hiciste voluntariamente.
              </Text>
            </View>

            {/* Activar: selector de duración */}
            {!isInvisible && (
              <>
                <Text style={styles.sectionLabel}>¿Por cuánto tiempo?</Text>
                <View style={styles.optionsGrid}>
                  {DURATION_OPTIONS.map(opt => {
                    const selected = selectedHours === opt.hours;
                    return (
                      <Pressable
                        key={opt.hours}
                        style={({ pressed }) => [
                          styles.optionCard,
                          selected && styles.optionCardSelected,
                          pressed && { opacity: 0.8 },
                        ]}
                        onPress={() => setSelectedHours(opt.hours)}
                      >
                        <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                          <Ionicons name={opt.icon} size={20} color={selected ? '#F59E0B' : '#78716C'} />
                        </View>
                        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                          {opt.label}
                        </Text>
                        <Text style={styles.optionDesc}>{opt.desc}</Text>
                        {selected && (
                          <View style={styles.optionCheck}>
                            <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, saving && { opacity: 0.6 }]}
                  onPress={activate}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="#1C1917" />
                    : <Ionicons name="eye-off-outline" size={20} color="#1C1917" />
                  }
                  <Text style={styles.primaryBtnText}>
                    {saving ? 'Activando...' : 'Activar modo invisible'}
                  </Text>
                </Pressable>
              </>
            )}

            {/* Desactivar */}
            {isInvisible && (
              <>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, styles.primaryBtnVisible, pressed && { opacity: 0.85 }, saving && { opacity: 0.6 }]}
                  onPress={deactivate}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="#1C1917" />
                    : <Ionicons name="eye-outline" size={20} color="#1C1917" />
                  }
                  <Text style={styles.primaryBtnText}>
                    {saving ? 'Desactivando...' : 'Volver a ser visible'}
                  </Text>
                </Pressable>

                <Text style={styles.sectionLabel}>Cambiar duración</Text>
                <View style={styles.optionsGrid}>
                  {DURATION_OPTIONS.map(opt => {
                    const selected = selectedHours === opt.hours;
                    return (
                      <Pressable
                        key={opt.hours}
                        style={({ pressed }) => [
                          styles.optionCard,
                          selected && styles.optionCardSelected,
                          pressed && { opacity: 0.8 },
                        ]}
                        onPress={() => setSelectedHours(opt.hours)}
                      >
                        <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                          <Ionicons name={opt.icon} size={20} color={selected ? '#F59E0B' : '#78716C'} />
                        </View>
                        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={[styles.secondaryBtn, saving && { opacity: 0.6 }]}
                  onPress={activate}
                  disabled={saving}
                >
                  <Ionicons name="refresh-outline" size={18} color="#F59E0B" />
                  <Text style={styles.secondaryBtnText}>Extender a {DURATION_OPTIONS.find(o => o.hours === selectedHours)?.label}</Text>
                </Pressable>
              </>
            )}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#292524',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FAFAF9' },

  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },

  statusCard: {
    borderRadius: Radius.xl, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5,
  },
  statusCardVisible: { backgroundColor: '#1C1917', borderColor: '#F59E0B44' },
  statusCardInvisible: { backgroundColor: '#1C1917', borderColor: '#7C3AED44' },
  statusIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  statusIconVisible: { backgroundColor: '#F59E0B22' },
  statusIconInvisible: { backgroundColor: '#7C3AED22' },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#FAFAF9', marginBottom: 3 },
  statusSub: { fontSize: 12, color: '#78716C', lineHeight: 17 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  badgeInvisible: { backgroundColor: '#7C3AED22' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#A78BFA', letterSpacing: 0.5 },

  infoCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#1C1917', borderRadius: Radius.lg,
    padding: 14, borderWidth: 1, borderColor: '#292524',
  },
  infoText: { flex: 1, fontSize: 13, color: '#78716C', lineHeight: 19 },
  infoHighlight: { color: '#A8A29E', fontStyle: 'italic' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#78716C', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },

  optionsGrid: { gap: 10 },
  optionCard: {
    backgroundColor: '#1C1917', borderRadius: Radius.lg,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#292524',
  },
  optionCardSelected: { borderColor: '#F59E0B', backgroundColor: '#F59E0B0D' },
  optionIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center',
  },
  optionIconSelected: { backgroundColor: '#F59E0B22' },
  optionLabel: { fontSize: 15, fontWeight: '600', color: '#A8A29E', flex: 1 },
  optionLabelSelected: { color: '#FAFAF9' },
  optionDesc: { fontSize: 11, color: '#57534E' },
  optionCheck: { marginLeft: 'auto' },

  primaryBtn: {
    backgroundColor: '#F59E0B', borderRadius: Radius.pill,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 8,
  },
  primaryBtnVisible: { backgroundColor: '#10B981' },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#1C1917' },

  secondaryBtn: {
    borderRadius: Radius.pill, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#F59E0B', marginTop: 4,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: '#F59E0B' },
});
