// 📁 cercania/app-scaffold/app/(app)/settings/geofences.tsx
/**
 * Pantalla de gestión de zonas seguras (geofences).
 * El usuario puede crear zonas con nombre, radio e icono.
 * Cuando un miembro del grupo entra/sale, el grupo recibe una notificación.
 *
 * Flujo:
 * 1. Lista de zonas existentes del usuario.
 * 2. Botón "Nueva zona" → abre modal para elegir nombre, radio e icono.
 * 3. La zona se crea centrada en la ubicación actual del usuario.
 * 4. Para cambiar la posición exacta, el usuario debe ir al mapa del grupo.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, Pressable, ScrollView,
    StyleSheet, Text, TextInput, View
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import { Button } from '../../../src/components/ui/Button';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../../src/lib/theme';
import { useAuth } from '../../../src/store/auth';
import { getSupabase } from '../../../src/lib/supabase';
import * as Location from 'expo-location';

// ─── Tipos ────────────────────────────────────────────────
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

// ─── Constantes ───────────────────────────────────────────
const ICONS = ['🏠', '🏫', '💼', '🏥', '🏪', '⛪', '🏋️', '🌳', '🏖️', '🏟️'];
const RADIUS_OPTIONS = [
    { label: '50 m', value: 50 },
    { label: '100 m', value: 100 },
    { label: '200 m', value: 200 },
    { label: '500 m', value: 500 },
    { label: '1 km', value: 1000 },
];

// ─── Componente de zona ────────────────────────────────────
function GeofenceCard({ zone, onToggle, onDelete }: { zone: Geofence; onToggle: () => void; onDelete: () => void }) {
    const radiusLabel = zone.radius_meters >= 1000
        ? `${zone.radius_meters / 1000} km`
        : `${zone.radius_meters} m`;
    const isActive = zone.notify_on_enter;

    return (
        <View style={[gcStyles.card, !isActive && gcStyles.cardInactive]}>
            <View style={gcStyles.iconBox}>
                <Text style={gcStyles.icon}>{zone.emoji}</Text>
            </View>
            <View style={gcStyles.info}>
                <Text style={gcStyles.name}>{zone.name}</Text>
                <Text style={gcStyles.sub}>Radio: {radiusLabel}</Text>
                <View style={[gcStyles.badge, { backgroundColor: isActive ? Colors.accentLight : Colors.surfaceAlt }]}>
                    <View style={[gcStyles.badgeDot, { backgroundColor: isActive ? Colors.accent : Colors.textMuted }]} />
                    <Text style={[gcStyles.badgeText, { color: isActive ? Colors.accentDark : Colors.textMuted }]}>
                        {isActive ? 'Activa' : 'Inactiva'}
                    </Text>
                </View>
            </View>
            <View style={gcStyles.actions}>
                <Pressable style={gcStyles.actionBtn} onPress={onToggle} hitSlop={8}>
                    <Text style={gcStyles.actionIcon}>{isActive ? '⏸️' : '▶️'}</Text>
                </Pressable>
                <Pressable style={[gcStyles.actionBtn, gcStyles.deleteBtn]} onPress={onDelete} hitSlop={8}>
                    <Text style={gcStyles.actionIcon}>🗑️</Text>
                </Pressable>
            </View>
        </View>
    );
}

const gcStyles = StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, ...Shadows.card },
    cardInactive: { opacity: 0.55 },
    iconBox: { width: 54, height: 54, borderRadius: 16, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    icon: { fontSize: 28 },
    info: { flex: 1, gap: 3 },
    name: { ...Typography.bodyBold, color: Colors.text },
    sub: { ...Typography.caption, color: Colors.textMuted },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    actions: { gap: 8 },
    actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { backgroundColor: Colors.dangerLight },
    actionIcon: { fontSize: 16 },
});

// ─── Pantalla principal ────────────────────────────────────
export default function GeofencesScreen() {
    const { user } = useAuth();
    const [zones, setZones] = useState<Geofence[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Estado del formulario
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('🏠');
    const [radius, setRadius] = useState(200);
    const [saving, setSaving] = useState(false);
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
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
                const parsed = data.map((d: any) => ({
                    id: d.groups.id,
                    name: d.groups.name,
                    emoji: d.groups.emoji,
                }));
                setGroups(parsed);
                if (parsed.length === 1) setSelectedGroupId(parsed[0].id);
            }
        };
        loadGroups();
    }, [user?.id]);

    const fetchCurrentLocation = async () => {
        setLoadingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') throw new Error('Permiso de ubicación denegado');
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setCoords(c);
            mapRef.current?.animateToRegion({ ...c, latitudeDelta: 0.003, longitudeDelta: 0.003 }, 500);
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
            const { data, error } = await sb
                .from('geofences')
                .select('*')
                .eq('created_by', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setZones(data ?? []);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally { setLoading(false); }
    }, [user?.id]);

    useEffect(() => { loadZones(); }, [loadZones]);

    const handleCreate = async () => {
        if (!name.trim()) { Alert.alert('Escribe un nombre para la zona'); return; }
        if (!selectedGroupId) { Alert.alert('Selecciona un grupo', 'Elige a qué grupo pertenece esta zona.'); return; }
        if (!coords) { Alert.alert('Selecciona la ubicación', 'Toca "Usar mi ubicación actual" primero.'); return; }
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
            setName('');
            setIcon('🏠');
            setRadius(200);
            await loadZones();
        } catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
    };

    const handleToggle = async (zone: Geofence) => {
        try {
            const sb = await getSupabase();
            const newVal = !zone.notify_on_enter;
            const { error } = await sb.from('geofences')
                .update({ notify_on_enter: newVal, notify_on_exit: newVal })
                .eq('id', zone.id);
            if (error) throw error;
            setZones(prev => prev.map(z => z.id === zone.id ? { ...z, notify_on_enter: newVal, notify_on_exit: newVal } : z));
        } catch (e: any) { Alert.alert('Error', e.message); }
    };

    const handleDelete = (zone: Geofence) => {
        Alert.alert('Eliminar zona', `¿Eliminar "${zone.name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: async () => {
                try {
                    const sb = await getSupabase();
                    const { error } = await sb.from('geofences').delete().eq('id', zone.id);
                    if (error) throw error;
                    setZones(prev => prev.filter(z => z.id !== zone.id));
                } catch (e: any) { Alert.alert('Error', e.message); }
            }}
        ]);
    };

    return (
        <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerBg} />
                    <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
                        <Text style={styles.backIcon}>←</Text>
                    </Pressable>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.title}>Zonas seguras</Text>
                            <Text style={styles.subtitle}>Tu grupo recibe alertas al entrar o salir</Text>
                        </View>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{zones.length}</Text>
                        </View>
                    </View>
                </View>

                {/* Info card */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoIcon}>💡</Text>
                    <Text style={styles.infoText}>
                        La zona se crea en tu ubicación actual. Puedes activarla o desactivarla en cualquier momento.
                    </Text>
                </View>

                {/* Botón crear */}
                <Pressable style={styles.createBtn} onPress={() => setModalVisible(true)}>
                    <View style={styles.createBtnIcon}>
                        <Text style={{ fontSize: 24 }}>➕</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.createBtnTitle}>Nueva zona segura</Text>
                        <Text style={styles.createBtnSub}>Casa, colegio, trabajo...</Text>
                    </View>
                    <Text style={{ fontSize: 22, color: Colors.primary }}>›</Text>
                </Pressable>

                {/* Lista */}
                {loading ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
                ) : zones.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyIcon}>📍</Text>
                        <Text style={styles.emptyTitle}>Sin zonas aún</Text>
                        <Text style={styles.emptyText}>
                            Crea tu primera zona segura. Tu grupo recibirá una notificación cuando llegues o te vayas.
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>Mis zonas ({zones.length})</Text>
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

                {/* Cómo funciona */}
                <View style={styles.howCard}>
                    <Text style={styles.howTitle}>¿Cómo funcionan?</Text>
                    {[
                        { icon: '1️⃣', text: 'Creas una zona con nombre y radio (ej: "Casa, 100 m")' },
                        { icon: '2️⃣', text: 'La zona se centra en donde estás ahora' },
                        { icon: '3️⃣', text: 'Cuando llegas o sales, tu grupo ve una notificación: "Fernando llegó a Casa"' },
                        { icon: '4️⃣', text: 'Puedes pausar zonas sin eliminarlas' },
                    ].map(s => (
                        <View key={s.icon} style={styles.howStep}>
                            <Text style={styles.howStepIcon}>{s.icon}</Text>
                            <Text style={styles.howStepText}>{s.text}</Text>
                        </View>
                    ))}
                </View>

            </ScrollView>

            {/* Modal nueva zona */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Nueva zona segura</Text>
                        <Text style={styles.modalSub}>Se creará en tu ubicación actual</Text>

                        {/* Grupo */}
                        {groups.length > 1 && (
                            <>
                                <Text style={styles.inputLabel}>Grupo *</Text>
                                <View style={styles.groupsRow}>
                                    {groups.map(g => (
                                        <Pressable
                                            key={g.id}
                                            style={[styles.groupOption, selectedGroupId === g.id && styles.groupOptionSelected]}
                                            onPress={() => setSelectedGroupId(g.id)}
                                        >
                                            <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
                                            <Text style={[styles.groupOptionText, selectedGroupId === g.id && styles.groupOptionTextSelected]}>
                                                {g.name}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* Nombre */}
                        <Text style={styles.inputLabel}>Nombre *</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Ej: Casa, Universidad, Trabajo..."
                            placeholderTextColor={Colors.textMuted}
                            maxLength={40}
                            autoFocus
                        />

                        {/* Icono */}
                        <Text style={styles.inputLabel}>Icono</Text>
                        <View style={styles.iconsRow}>
                            {ICONS.map(ic => (
                                <Pressable
                                    key={ic}
                                    style={[styles.iconOption, icon === ic && styles.iconOptionSelected]}
                                    onPress={() => setIcon(ic)}
                                >
                                    <Text style={{ fontSize: 24 }}>{ic}</Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Radio */}
                        <Text style={styles.inputLabel}>Radio de la zona</Text>
                        <View style={styles.radiusRow}>
                            {RADIUS_OPTIONS.map(opt => (
                                <Pressable
                                    key={opt.value}
                                    style={[styles.radiusOption, radius === opt.value && styles.radiusOptionSelected]}
                                    onPress={() => setRadius(opt.value)}
                                >
                                    <Text style={[styles.radiusText, radius === opt.value && styles.radiusTextSelected]}>
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Ubicación */}
                        <Text style={styles.inputLabel}>Ubicación de la zona</Text>
                        <Pressable style={styles.locationBtn} onPress={fetchCurrentLocation} disabled={loadingLocation}>
                            {loadingLocation
                                ? <ActivityIndicator size="small" color={Colors.primary} />
                                : <Text style={{ fontSize: 16 }}>📍</Text>
                            }
                            <Text style={styles.locationBtnText}>
                                {loadingLocation ? 'Obteniendo ubicación...' : coords ? 'Actualizar ubicación' : 'Usar mi ubicación actual'}
                            </Text>
                        </Pressable>

                        {coords && (
                            <View style={styles.mapWrap}>
                                <MapView
                                    ref={mapRef}
                                    style={styles.map}
                                    provider={PROVIDER_GOOGLE}
                                    mapType="hybrid"
                                    initialRegion={{
                                        ...coords,
                                        latitudeDelta: 0.003,
                                        longitudeDelta: 0.003,
                                    }}
                                    onPress={(e) => setCoords(e.nativeEvent.coordinate)}
                                >
                                    <Marker
                                        coordinate={coords}
                                        draggable
                                        onDragEnd={(e) => setCoords(e.nativeEvent.coordinate)}
                                        title={name || 'Zona'}
                                    />
                                    <Circle
                                        center={coords}
                                        radius={radius}
                                        fillColor="rgba(245,158,11,0.15)"
                                        strokeColor="#F59E0B"
                                        strokeWidth={2}
                                    />
                                </MapView>
                                <Text style={styles.mapHint}>Toca o arrastra el pin para ajustar la posición</Text>
                            </View>
                        )}

                        <Button title="Crear zona" variant="primary" fullWidth loading={saving} onPress={handleCreate} style={{ marginTop: Spacing.lg }} />
                        <Button title="Cancelar" variant="ghost" fullWidth onPress={() => { setModalVisible(false); setName(''); setCoords(null); if (groups.length > 1) setSelectedGroupId(null); }} style={{ marginTop: Spacing.sm }} />
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: Colors.bg },
    content: { paddingBottom: 48 },

    header: { paddingHorizontal: Spacing.xl, paddingTop: 52, paddingBottom: Spacing.xxl, position: 'relative', overflow: 'hidden' },
    headerBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bgAlt, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, ...Shadows.card },
    backIcon: { fontSize: 18, color: Colors.text, fontWeight: '700' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...Typography.h1, color: Colors.text },
    subtitle: { ...Typography.caption, color: Colors.textSoft, marginTop: 4 },
    countBadge: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.button },
    countText: { fontSize: 20, fontWeight: '900', color: '#fff' },

    infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginHorizontal: Spacing.xl, marginTop: Spacing.lg, backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderBlue },
    infoIcon: { fontSize: 18 },
    infoText: { ...Typography.caption, color: Colors.primaryDeep, flex: 1, lineHeight: 18 },

    createBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.xl, marginTop: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed' },
    createBtnIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    createBtnTitle: { ...Typography.bodyBold, color: Colors.primary },
    createBtnSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },

    sectionTitle: { ...Typography.h3, color: Colors.text, marginHorizontal: Spacing.xl, marginTop: Spacing.xl, marginBottom: Spacing.md },

    emptyCard: { marginHorizontal: Spacing.xl, marginTop: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
    emptyIcon: { fontSize: 52, marginBottom: Spacing.md },
    emptyTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.xs },
    emptyText: { ...Typography.body, color: Colors.textSoft, textAlign: 'center', lineHeight: 22 },

    howCard: { marginHorizontal: Spacing.xl, marginTop: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadows.card },
    howTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.md },
    howStep: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
    howStepIcon: { fontSize: 18, width: 28 },
    howStepText: { ...Typography.caption, color: Colors.textSoft, flex: 1, lineHeight: 18 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingBottom: 36 },
    modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
    modalTitle: { ...Typography.h2, color: Colors.text, textAlign: 'center' },
    modalSub: { ...Typography.caption, color: Colors.textSoft, textAlign: 'center', marginTop: 4, marginBottom: Spacing.md },
    inputLabel: { ...Typography.bodyBold, color: Colors.text, marginBottom: Spacing.xs, marginTop: Spacing.md },
    input: { backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.md, ...Typography.body, color: Colors.text },

    iconsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
    iconOption: { width: 48, height: 48, borderRadius: 13, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
    iconOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },

    radiusRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs, flexWrap: 'wrap' },
    radiusOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent' },
    radiusOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
    radiusText: { fontSize: 13, fontWeight: '700', color: Colors.textSoft },
    radiusTextSelected: { color: Colors.primary },

    previewCard: { marginTop: Spacing.lg, backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderBlue },
    previewIcon: { fontSize: 32, marginBottom: 4 },
    previewName: { ...Typography.bodyBold, color: Colors.text },
    previewRadius: { ...Typography.caption, color: Colors.primaryDark, marginTop: 2 },

    locationBtn: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.primaryLight, borderRadius: Radius.lg,
        padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary,
        marginTop: Spacing.xs,
    },
    locationBtnText: { ...Typography.bodyBold, color: Colors.primaryDark },
    mapWrap: { marginTop: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.border },
    map: { width: '100%', height: 200 },
    mapHint: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', paddingVertical: 6, backgroundColor: Colors.surfaceAlt },

    groupsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
    groupOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent' },
    groupOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
    groupOptionText: { ...Typography.bodyBold, color: Colors.textSoft },
    groupOptionTextSelected: { color: Colors.primaryDark },
});
