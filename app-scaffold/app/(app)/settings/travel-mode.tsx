// 📁 cercania/app-scaffold/app/(app)/settings/travel-mode.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable,
  ScrollView, StyleSheet, Switch, Text, View
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../../src/lib/theme';
import { getSupabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/store/auth';

interface TravelModeSettings {
  enabled: boolean;
  home_latitude: number | null;
  home_longitude: number | null;
  city_radius_km: number;
  fast_interval_min: number;
  notify_group: boolean;
}

const DEFAULT_SETTINGS: TravelModeSettings = {
  enabled: false,
  home_latitude: null,
  home_longitude: null,
  city_radius_km: 30,
  fast_interval_min: 2,
  notify_group: true,
};

const RADIUS_OPTIONS = [10, 20, 30, 50, 100];
const INTERVAL_OPTIONS = [1, 2, 5, 10];

export default function TravelModeScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TravelModeSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const sb = await getSupabase();
      const { data } = await sb
        .from('travel_mode_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (data) setSettings(data);
    } catch (_) {
      // No existe aún — usar defaults
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: TravelModeSettings) => {
    setSaving(true);
    try {
      const sb = await getSupabase();
      await sb.from('travel_mode_settings').upsert({
        user_id: user?.id,
        ...newSettings,
        updated_at: new Date().toISOString(),
      });
      setSettings(newSettings);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const setHomeToCurrentLocation = async () => {
    try {
      const sb = await getSupabase();
      const { data: loc } = await sb
        .from('locations')
        .select('latitude, longitude')
        .eq('user_id', user?.id)
        .single();

      if (!loc) { Alert.alert('Sin ubicación', 'Activa el rastreo primero'); return; }

      const updated = { ...settings, home_latitude: loc.latitude, home_longitude: loc.longitude };
      await saveSettings(updated);
      Alert.alert('✅ Casa actualizada', 'Tu ubicación actual quedó guardada como casa.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const toggle = (field: keyof TravelModeSettings, value: any) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    saveSettings(updated);
  };

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBg} />
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>✈️ Modo viaje</Text>
        <Text style={styles.headerSub}>Tracking más frecuente cuando estás lejos de casa</Text>
      </View>

      {/* Toggle principal */}
      <View style={[styles.card, settings.enabled && styles.cardActive]}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconBox, { backgroundColor: settings.enabled ? Colors.primaryLight : Colors.surfaceAlt }]}>
              <Text style={styles.iconEmoji}>✈️</Text>
            </View>
            <View>
              <Text style={styles.cardTitle}>Modo viaje</Text>
              <Text style={styles.cardSub}>
                {settings.enabled ? 'Activo — monitoreando distancia de casa' : 'Inactivo'}
              </Text>
            </View>
          </View>
          {saving
            ? <ActivityIndicator color={Colors.primary} />
            : <Switch
                value={settings.enabled}
                onValueChange={(v) => toggle('enabled', v)}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
                ios_backgroundColor={Colors.border}
              />
          }
        </View>
        {settings.enabled && (
          <View style={styles.activeBanner}>
            <Text style={styles.activeBannerText}>
              🟢 Cuando salgas más de {settings.city_radius_km} km de casa, el GPS se actualizará cada {settings.fast_interval_min} min
            </Text>
          </View>
        )}
      </View>

      {/* Configurar casa */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PUNTO DE ORIGEN (CASA)</Text>
        <View style={styles.homeCard}>
          {settings.home_latitude ? (
            <View style={styles.homeInfo}>
              <Text style={styles.homeIcon}>🏠</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.homeTitle}>Casa configurada</Text>
                <Text style={styles.homeCoords}>
                  {settings.home_latitude.toFixed(4)}, {settings.home_longitude?.toFixed(4)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.homeInfo}>
              <Text style={styles.homeIcon}>📍</Text>
              <Text style={styles.homeNone}>Sin punto de origen configurado</Text>
            </View>
          )}
          <Pressable style={styles.homeBtn} onPress={setHomeToCurrentLocation}>
            <Text style={styles.homeBtnText}>
              {settings.home_latitude ? '📍 Actualizar con mi ubicación actual' : '📍 Usar mi ubicación actual como casa'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Radio de la ciudad */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>RADIO DE LA CIUDAD</Text>
        <Text style={styles.sectionDesc}>Distancia máxima desde casa para considerar que estás "en casa"</Text>
        <View style={styles.optionsRow}>
          {RADIUS_OPTIONS.map(r => (
            <Pressable key={r} style={[styles.optionChip, settings.city_radius_km === r && styles.optionChipActive]}
              onPress={() => toggle('city_radius_km', r)}>
              <Text style={[styles.optionText, settings.city_radius_km === r && styles.optionTextActive]}>
                {r} km
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Intervalo en viaje */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>INTERVALO EN VIAJE</Text>
        <Text style={styles.sectionDesc}>Cada cuánto minutos se actualiza la ubicación cuando estás fuera</Text>
        <View style={styles.optionsRow}>
          {INTERVAL_OPTIONS.map(m => (
            <Pressable key={m} style={[styles.optionChip, settings.fast_interval_min === m && styles.optionChipActive]}
              onPress={() => toggle('fast_interval_min', m)}>
              <Text style={[styles.optionText, settings.fast_interval_min === m && styles.optionTextActive]}>
                {m} min
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Notificar al grupo */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>NOTIFICACIONES</Text>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Avisar al grupo cuando salgas de viaje</Text>
            <Text style={styles.toggleSub}>Tu familia recibirá una notificación al detectar que estás lejos</Text>
          </View>
          <Switch
            value={settings.notify_group}
            onValueChange={(v) => toggle('notify_group', v)}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor="#fff"
            ios_backgroundColor={Colors.border}
          />
        </View>
      </View>

      {/* Explicación */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ ¿Cómo funciona?</Text>
        <Text style={styles.infoText}>
          Cuando el modo viaje está activo, Cercanía compara tu ubicación con el punto de origen que configuraste.
          {'\n\n'}Si estás a más de <Text style={{ fontWeight: '700' }}>{settings.city_radius_km} km</Text> de casa, el GPS se actualiza cada <Text style={{ fontWeight: '700' }}>{settings.fast_interval_min} minutos</Text> en lugar del intervalo normal.
          {'\n\n'}Ideal para viajes universitarios, viajes de trabajo, o cuando un familiar sale de la ciudad.
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
  headerSub: { ...Typography.body, color: Colors.textSoft, marginTop: 4 },

  card: { marginHorizontal: Spacing.xl, marginTop: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.border, ...Shadows.card },
  cardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  iconBox: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 26 },
  cardTitle: { ...Typography.bodyBold, color: Colors.text },
  cardSub: { ...Typography.caption, color: Colors.textSoft, marginTop: 2 },
  activeBanner: { marginTop: Spacing.md, backgroundColor: Colors.accent + '22', borderRadius: Radius.lg, padding: Spacing.md },
  activeBannerText: { fontSize: 13, fontWeight: '600', color: Colors.accentDark, lineHeight: 19 },

  section: { marginHorizontal: Spacing.xl, marginTop: Spacing.xl },
  sectionLabel: { ...Typography.label, color: Colors.textMuted, marginBottom: Spacing.xs },
  sectionDesc: { ...Typography.caption, color: Colors.textSoft, marginBottom: Spacing.md },

  homeCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadows.card },
  homeInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  homeIcon: { fontSize: 28 },
  homeTitle: { ...Typography.bodyBold, color: Colors.text },
  homeCoords: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  homeNone: { ...Typography.body, color: Colors.textMuted, flex: 1 },
  homeBtn: { backgroundColor: Colors.primaryLight, borderRadius: Radius.pill, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary },
  homeBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },

  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  optionChip: { backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1.5, borderColor: Colors.border },
  optionChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  optionText: { fontSize: 14, fontWeight: '600', color: Colors.textSoft },
  optionTextActive: { color: Colors.primaryDark },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadows.card },
  toggleLabel: { ...Typography.bodyBold, color: Colors.text },
  toggleSub: { ...Typography.caption, color: Colors.textSoft, marginTop: 2 },

  infoCard: { marginHorizontal: Spacing.xl, marginTop: Spacing.xl, backgroundColor: Colors.bgAlt, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  infoTitle: { ...Typography.bodyBold, color: Colors.text, marginBottom: Spacing.sm },
  infoText: { ...Typography.body, color: Colors.textSoft, lineHeight: 22 },
});
