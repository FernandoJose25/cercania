import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '../../../src/lib/theme';
import { useAuth } from '../../../src/store/auth';
import { getSupabase } from '../../../src/lib/supabase';
import * as Location from 'expo-location';

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  emoji: string;
  notify_on_enter: boolean;
  notify_on_exit: boolean;
  created_at: string;
}

const ICONS = ['🏠', '🏫', '💼', '🏥', '🏪', '⛪', '🏋️', '🌳', '🏖️', '🏟️'];
const RADIUS_OPTIONS = [
  { label: '50 m', value: 50 },
  { label: '100 m', value: 100 },
  { label: '200 m', value: 200 },
  { label: '500 m', value: 500 },
  { label: '1 km', value: 1000 },
];

// Pasos del wizard de creación
type Step = 'info' | 'map';

function GeofenceCard({
  zone, onToggle, onDelete,
}: { zone: Geofence; onToggle: () => void; onDelete: () => void }) {
  const radiusLabel = zone.radius_meters >= 1000
    ? `${zone.radius_meters / 1000} km` : `${zone.radius_meters} m`;
  const isActive = zone.notify_on_enter;

  return (
    <View style={[gcS.card, !isActive && gcS.cardOff]}>
      <View style={gcS.iconBox}>
        <Text style={gcS.icon}>{zone.emoji}</Text>
      </View>
      <View style={gcS.info}>
        <Text style={gcS.name}>{zone.name}</Text>
        <Text style={gcS.sub}>Radio: {radiusLabel}</Text>
        <View style={[gcS.badge, isActive ? gcS.badgeOn : gcS.badgeOff]}>
          <View style={[gcS.dot, { backgroundColor: isActive ? '#10B981' : '#57534E' }]} />
          <Text style={[gcS.badgeTxt, { color: isActive ? '#10B981' : '#57534E' }]}>
            {isActive ? 'Activa' : 'Inactiva'}
          </Text>
        </View>
      </View>
      <View style={gcS.actions}>
        <Pressable style={gcS.iconBtn} onPress={onToggle} hitSlop={8}>
          <Ionicons name={isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={22} color={isActive ? '#78716C' : '#10B981'} />
        </Pressable>
        <Pressable style={[gcS.iconBtn, gcS.deleteBtn]} onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
}

const gcS = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1C1917', borderRadius: Radius.xl,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#292524',
  },
  cardOff: { opacity: 0.5 },
  iconBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#F59E0B22', alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '700', color: '#FAFAF9' },
  sub: { fontSize: 12, color: '#78716C' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 2,
  },
  badgeOn: { backgroundColor: '#10B98122' },
  badgeOff: { backgroundColor: '#292524' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  actions: { gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: { backgroundColor: '#EF444422' },
});

// ─── Pantalla principal ────────────────────────────────────────────────────────
export default function GeofencesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ groupId?: string; groupName?: string }>();
  const paramGroupId = params.groupId ?? null;
  const paramGroupName = params.groupName ?? null;

  const [zones, setZones] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal wizard
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<Step>('info');

  // Campos del formulario
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏠');
  const [radius, setRadius] = useState(200);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(paramGroupId);
  const [groups, setGroups] = useState<{ id: string; name: string; emoji: string }[]>([]);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const loadGroups = async () => {
      if (!user?.id) return;
      const sb = await getSupabase();
      const { data } = await sb
        .from('group_members')
        .select('group_id, groups(id, name, emoji)')
        .eq('user_id', user.id);
      if (data) {
        const parsed = data.map((d: any) => ({ id: d.groups.id, name: d.groups.name, emoji: d.groups.emoji }));
        setGroups(parsed);
        if (!paramGroupId && parsed.length === 1) setSelectedGroupId(parsed[0].id);
      }
    };
    loadGroups();
  }, [user?.id]);

  const fetchCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Permiso de ubicación denegado');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCoords(c);
      setTimeout(() => {
        mapRef.current?.animateToRegion({ ...c, latitudeDelta: 0.003, longitudeDelta: 0.003 }, 600);
      }, 300);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoadingLocation(false);
    }
  };

  const loadZones = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const sb = await getSupabase();
      let query = sb.from('geofences').select('*').order('created_at', { ascending: false });
      if (paramGroupId) {
        query = query.eq('group_id', paramGroupId);
      } else {
        query = query.eq('created_by', user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      setZones(data ?? []);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, paramGroupId]);

  useEffect(() => { loadZones(); }, [loadZones]);

  const openModal = () => {
    setName('');
    setIcon('🏠');
    setRadius(200);
    setCoords(null);
    setStep('info');
    setModalVisible(true);
  };

  const goToMap = () => {
    if (!name.trim()) { Alert.alert('Escribe un nombre'); return; }
    if (!selectedGroupId) { Alert.alert('Selecciona un grupo'); return; }
    setStep('map');
    // Obtener ubicación automáticamente al pasar al paso del mapa
    if (!coords) fetchCurrentLocation();
  };

  const handleCreate = async () => {
    if (!coords) { Alert.alert('Ubica la zona en el mapa'); return; }
    setSaving(true);
    try {
      const sb = await getSupabase();
      const { error } = await sb.from('geofences').insert({
        created_by: user!.id,
        group_id: selectedGroupId,
        name: name.trim(),
        emoji: icon,
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius_meters: radius,
        notify_on_enter: true,
        notify_on_exit: true,
      });
      if (error) throw error;
      setModalVisible(false);
      loadZones();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (zone: Geofence) => {
    try {
      const sb = await getSupabase();
      const newVal = !zone.notify_on_enter;
      await sb.from('geofences').update({ notify_on_enter: newVal, notify_on_exit: newVal }).eq('id', zone.id);
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, notify_on_enter: newVal, notify_on_exit: newVal } : z));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = (zone: Geofence) => {
    Alert.alert('Eliminar zona', `¿Eliminar "${zone.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            const sb = await getSupabase();
            await sb.from('geofences').delete().eq('id', zone.id);
            setZones(prev => prev.filter(z => z.id !== zone.id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#FAFAF9" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {paramGroupName ? `Zonas de ${paramGroupName}` : 'Zonas seguras'}
          </Text>
          <Text style={styles.headerSub}>Alertas al entrar o salir</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{zones.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Botón nueva zona */}
        <Pressable
          style={({ pressed }) => [styles.createCard, pressed && { opacity: 0.8 }]}
          onPress={openModal}
        >
          <View style={styles.createIconWrap}>
            <Ionicons name="add-circle" size={28} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.createTitle}>Nueva zona segura</Text>
            <Text style={styles.createSub}>Casa, colegio, trabajo...</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#57534E" />
        </Pressable>

        {/* Info */}
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={16} color="#57534E" />
          <Text style={styles.infoText}>
            Tu grupo recibe una notificación cuando llegas o sales de cada zona.
          </Text>
        </View>

        {/* Lista de zonas */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : zones.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="location-outline" size={40} color="#57534E" />
            </View>
            <Text style={styles.emptyTitle}>Sin zonas aún</Text>
            <Text style={styles.emptyText}>
              Crea tu primera zona. Tu grupo recibirá alertas al entrar o salir.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>MIS ZONAS</Text>
            {zones.map(zone => (
              <GeofenceCard
                key={zone.id}
                zone={zone}
                onToggle={() => handleToggle(zone)}
                onDelete={() => handleDelete(zone)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* ─── Modal wizard ─────────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide" statusBarTranslucent>
        <View style={mS.overlay}>
          <View style={[mS.sheet, step === 'map' && mS.sheetTall]}>
            {/* Handle */}
            <View style={mS.handle} />

            {/* Paso 1: info */}
            {step === 'info' && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={mS.row}>
                  <Text style={mS.title}>Nueva zona segura</Text>
                  <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                    <Ionicons name="close" size={24} color="#78716C" />
                  </Pressable>
                </View>

                {/* Selector de grupo si hay varios */}
                {!paramGroupId && groups.length > 1 && (
                  <>
                    <Text style={mS.label}>Grupo *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mS.groupsRow}>
                      {groups.map(g => (
                        <Pressable
                          key={g.id}
                          style={[mS.groupChip, selectedGroupId === g.id && mS.groupChipSelected]}
                          onPress={() => setSelectedGroupId(g.id)}
                        >
                          <Text style={{ fontSize: 18 }}>{g.emoji}</Text>
                          <Text style={[mS.groupChipText, selectedGroupId === g.id && mS.groupChipTextSelected]}>
                            {g.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                )}

                {/* Nombre */}
                <Text style={mS.label}>Nombre *</Text>
                <TextInput
                  style={mS.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej: Casa, Universidad, Trabajo..."
                  placeholderTextColor="#57534E"
                  maxLength={40}
                  autoFocus
                />

                {/* Icono */}
                <Text style={mS.label}>Icono</Text>
                <View style={mS.iconsRow}>
                  {ICONS.map(ic => (
                    <Pressable
                      key={ic}
                      style={[mS.iconOption, icon === ic && mS.iconOptionSelected]}
                      onPress={() => setIcon(ic)}
                    >
                      <Text style={{ fontSize: 24 }}>{ic}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Radio */}
                <Text style={mS.label}>Radio de la zona</Text>
                <View style={mS.radiusRow}>
                  {RADIUS_OPTIONS.map(opt => (
                    <Pressable
                      key={opt.value}
                      style={[mS.radiusChip, radius === opt.value && mS.radiusChipSelected]}
                      onPress={() => setRadius(opt.value)}
                    >
                      <Text style={[mS.radiusText, radius === opt.value && mS.radiusTextSelected]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable style={mS.nextBtn} onPress={goToMap}>
                  <Text style={mS.nextBtnText}>Elegir ubicación en el mapa</Text>
                  <Ionicons name="map-outline" size={18} color="#1C1917" />
                </Pressable>

                <Pressable style={mS.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={mS.cancelBtnText}>Cancelar</Text>
                </Pressable>
              </ScrollView>
            )}

            {/* Paso 2: mapa — SIN ScrollView para que el drag funcione */}
            {step === 'map' && (
              <View style={{ flex: 1 }}>
                <View style={mS.row}>
                  <Pressable onPress={() => setStep('info')} style={mS.backMapBtn} hitSlop={8}>
                    <Ionicons name="chevron-back" size={20} color="#FAFAF9" />
                  </Pressable>
                  <Text style={mS.title}>Elige la ubicación</Text>
                  <View style={{ width: 36 }} />
                </View>

                <View style={mS.mapHintRow}>
                  <Ionicons name="hand-left-outline" size={14} color="#78716C" />
                  <Text style={mS.mapHintText}>Toca el mapa o arrastra el pin para posicionar la zona</Text>
                </View>

                {/* Mapa FUERA de ScrollView = drag funciona correctamente */}
                <View style={mS.mapWrap}>
                  {coords ? (
                    <MapView
                      ref={mapRef}
                      style={mS.map}
                      provider={PROVIDER_GOOGLE}
                      mapType="hybrid"
                      initialRegion={{ ...coords, latitudeDelta: 0.003, longitudeDelta: 0.003 }}
                      onPress={e => setCoords(e.nativeEvent.coordinate)}
                      scrollEnabled
                      zoomEnabled
                      rotateEnabled={false}
                    >
                      <Marker
                        coordinate={coords}
                        draggable
                        onDragEnd={e => setCoords(e.nativeEvent.coordinate)}
                        title={name || 'Zona segura'}
                      >
                        <View style={mS.markerWrap}>
                          <Text style={{ fontSize: 24 }}>{icon}</Text>
                        </View>
                      </Marker>
                      <Circle
                        center={coords}
                        radius={radius}
                        fillColor="rgba(245,158,11,0.15)"
                        strokeColor="#F59E0B"
                        strokeWidth={2}
                      />
                    </MapView>
                  ) : (
                    <View style={mS.mapLoading}>
                      <ActivityIndicator color={Colors.primary} size="large" />
                      <Text style={mS.mapLoadingText}>
                        {loadingLocation ? 'Obteniendo ubicación...' : 'Cargando mapa...'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Botones bajo el mapa */}
                <View style={mS.mapActions}>
                  <Pressable style={mS.relocateBtn} onPress={fetchCurrentLocation} disabled={loadingLocation}>
                    <Ionicons name="locate-outline" size={18} color="#F59E0B" />
                    <Text style={mS.relocateBtnText}>Mi ubicación</Text>
                  </Pressable>

                  <Pressable
                    style={[mS.createBtn, (!coords || saving) && mS.createBtnDisabled]}
                    onPress={handleCreate}
                    disabled={!coords || saving}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color="#1C1917" />
                      : <Ionicons name="checkmark" size={20} color="#1C1917" />
                    }
                    <Text style={mS.createBtnText}>{saving ? 'Guardando...' : 'Crear zona aquí'}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#F59E0B', borderRadius: Radius.pill,
    minWidth: 32, height: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  countText: { fontSize: 15, fontWeight: '800', color: '#1C1917' },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },

  createCard: {
    backgroundColor: '#1C1917', borderRadius: Radius.xl,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: '#F59E0B44', borderStyle: 'dashed',
  },
  createIconWrap: {
    width: 50, height: 50, borderRadius: 15,
    backgroundColor: '#F59E0B22', alignItems: 'center', justifyContent: 'center',
  },
  createTitle: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
  createSub: { fontSize: 12, color: '#78716C', marginTop: 2 },

  infoRow: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#1C1917', borderRadius: Radius.lg, padding: 12,
    borderWidth: 1, borderColor: '#292524',
  },
  infoText: { flex: 1, fontSize: 12, color: '#57534E', lineHeight: 18 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#57534E', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },

  emptyCard: {
    backgroundColor: '#1C1917', borderRadius: Radius.xl,
    padding: 32, alignItems: 'center',
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

// Estilos del modal
const mS = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1917',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 36,
    maxHeight: '85%',
  },
  sheetTall: { maxHeight: '95%', flex: 1 },
  handle: {
    width: 36, height: 4, backgroundColor: '#3C3936',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#FAFAF9' },
  label: { fontSize: 12, fontWeight: '700', color: '#78716C', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#292524', borderRadius: Radius.lg,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#FAFAF9',
    borderWidth: 1.5, borderColor: '#3C3936',
  },

  iconsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOption: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  iconOptionSelected: { borderColor: '#F59E0B', backgroundColor: '#F59E0B22' },

  radiusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  radiusChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.pill, backgroundColor: '#292524',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  radiusChipSelected: { borderColor: '#F59E0B', backgroundColor: '#F59E0B22' },
  radiusText: { fontSize: 13, fontWeight: '700', color: '#78716C' },
  radiusTextSelected: { color: '#F59E0B' },

  groupsRow: { gap: 8, paddingBottom: 4 },
  groupChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.lg, backgroundColor: '#292524',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  groupChipSelected: { borderColor: '#F59E0B', backgroundColor: '#F59E0B22' },
  groupChipText: { fontSize: 14, fontWeight: '600', color: '#78716C' },
  groupChipTextSelected: { color: '#F59E0B' },

  nextBtn: {
    backgroundColor: '#F59E0B', borderRadius: Radius.pill,
    paddingVertical: 15, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#1C1917' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelBtnText: { fontSize: 15, color: '#78716C' },

  // Paso mapa
  backMapBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center',
  },
  mapHintRow: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: '#292524', borderRadius: Radius.lg,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
  },
  mapHintText: { fontSize: 12, color: '#78716C', flex: 1 },
  mapWrap: {
    flex: 1, borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#292524', minHeight: 280,
  },
  map: { flex: 1 },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C0A09', gap: 12 },
  mapLoadingText: { fontSize: 13, color: '#78716C' },
  markerWrap: {
    backgroundColor: '#1C1917', borderRadius: 20, padding: 6,
    borderWidth: 2, borderColor: '#F59E0B',
    shadowColor: '#F59E0B', shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
  },
  mapActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  relocateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F59E0B22', borderRadius: Radius.pill,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#F59E0B',
  },
  relocateBtnText: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  createBtn: {
    flex: 1, backgroundColor: '#F59E0B', borderRadius: Radius.pill,
    paddingVertical: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  createBtnDisabled: { backgroundColor: '#292524' },
  createBtnText: { fontSize: 15, fontWeight: '700', color: '#1C1917' },
});
