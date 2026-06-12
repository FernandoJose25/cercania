// 📁 cercania/app-scaffold/app/(app)/map/[groupId].tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import MapView, { AnimatedRegion, Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useGroupLive } from '../../../src/hooks/useGroupLive';
import { useAuth } from '../../../src/store/auth';
import { Colors, Radius, Shadows, Spacing, Typography, Tracking } from '../../../src/lib/theme';
import { lastSeenShort, batteryIcon, getInitials } from '../../../src/utils/format';
import {
  startForegroundTracking,
  stopForegroundTracking,
  getCurrentLocation
} from '../../../src/services/tracking.service';

export default function MapScreen() {
  const { groupId } = useLocalSearchParams();
  const currentUserId = useAuth(s => s.user?.id);
  const { snapshot, loading, error, refresh } = useGroupLive(groupId ?? null);
  const mapRef = useRef(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [following, setFollowing] = useState(true);
  const mapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // AnimatedRegion por cada miembro — para animación suave del pin
  const animatedCoords = useRef<Record<string, AnimatedRegion>>({}).current;

  useFocusEffect(
    useCallback(() => {
      getCurrentLocation().catch(() => { });
      startForegroundTracking(() => { }).catch(console.warn);
      // Timeout de seguridad: si el mapa no carga en 10s, mostrar error
      mapTimeoutRef.current = setTimeout(() => {
        setMapReady(prev => { if (!prev) setMapError(true); return prev; });
      }, 10000);
      return () => {
        stopForegroundTracking().catch(() => { });
        if (mapTimeoutRef.current) clearTimeout(mapTimeoutRef.current);
      };
    }, [])
  );

  // Centrar al primer load
  useEffect(() => {
    if (mapReady && snapshot?.members?.length) {
      setTimeout(() => fitToMembers(), 600);
    }
  }, [mapReady, snapshot?.members?.length]);

  // Animar pins suavemente cuando cambia la posición de cada miembro
  useEffect(() => {
    (snapshot?.members ?? []).forEach(m => {
      if (!m.location || m.is_invisible) return;
      const { latitude, longitude } = m.location;
      if (!animatedCoords[m.user_id]) {
        animatedCoords[m.user_id] = new AnimatedRegion({
          latitude,
          longitude,
          latitudeDelta: 0,
          longitudeDelta: 0,
        });
      } else {
        animatedCoords[m.user_id].timing({
          latitude,
          longitude,
          latitudeDelta: 0,
          longitudeDelta: 0,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }
    });
  }, [snapshot?.members]);

  // Seguir mi ubicación en tiempo real mientras following=true
  const myLocation = (snapshot?.members ?? []).find(m => m.user_id === currentUserId)?.location;
  useEffect(() => {
    if (!following || !mapReady || !myLocation) return;
    mapRef.current?.animateToRegion({
      latitude: myLocation.latitude,
      longitude: myLocation.longitude,
      latitudeDelta: 0.004,
      longitudeDelta: 0.004,
    }, 600);
  }, [myLocation?.latitude, myLocation?.longitude, following, mapReady]);

  const fitToMembers = useCallback(() => {
    if (!snapshot) return;
    const coords = (snapshot.members ?? [])
      .filter(m => m.location && !m.is_invisible)
      .map(m => ({ latitude: m.location.latitude, longitude: m.location.longitude }));
    if (coords.length === 0) return;
    if (coords.length === 1) {
      mapRef.current?.animateToRegion({ ...coords[0], latitudeDelta: 0.004, longitudeDelta: 0.004 }, 800);
      return;
    }
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 120, right: 60, bottom: 220, left: 60 },
      animated: true
    });
  }, [snapshot]);

  const goToMyLocation = useCallback(() => {
    const me = (snapshot?.members ?? []).find(m => m.user_id === currentUserId);
    if (!me?.location) return;
    setFollowing(true); // reactiva el seguimiento automático
    mapRef.current?.animateToRegion({
      latitude: me.location.latitude,
      longitude: me.location.longitude,
      latitudeDelta: 0.003,
      longitudeDelta: 0.003
    }, 600);
  }, [snapshot, currentUserId]);

  if (loading && !snapshot) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  if (error || mapError) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🗺️</Text>
        <Text style={styles.errorText}>
          {mapError ? 'El mapa tardó demasiado en cargar.\nVerifica tu conexión a internet.' : `Error: ${error}`}
        </Text>
        <Pressable onPress={() => { setMapError(false); refresh(); }} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={[styles.retryBtn, { backgroundColor: Colors.surfaceAlt, marginTop: 8 }]}>
          <Text style={[styles.retryText, { color: Colors.text }]}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: -8.1116,
          longitude: -79.0282,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass
        showsBuildings
        loadingEnabled
        loadingIndicatorColor={Colors.primary}
        mapType="hybrid"
        onMapReady={() => { setMapReady(true); if (mapTimeoutRef.current) clearTimeout(mapTimeoutRef.current); }}
        onPress={() => setSelectedMemberId(null)}
        onPanDrag={() => setFollowing(false)}
      >
        {(snapshot?.geofences ?? []).map(gf => (
          <Circle
            key={gf.id}
            center={{ latitude: gf.latitude, longitude: gf.longitude }}
            radius={gf.radius_meters}
            fillColor="rgba(245,158,11,0.1)"
            strokeColor="rgba(245,158,11,0.6)"
            strokeWidth={2}
            zIndex={1}
          />
        ))}

        {(snapshot?.members ?? [])
          .filter(m => m.location && !m.is_invisible)
          .map(m => {
            const isStale = m.location
              ? Date.now() - new Date(m.location.updated_at).getTime() > Tracking.staleAfterMin * 60 * 1000
              : true;
            const isMe = m.user_id === currentUserId;
            const hasSOS = !!m.active_sos;
            const isSelected = m.user_id === selectedMemberId;
            const pinColor = hasSOS ? Colors.danger : isMe ? Colors.primary : isStale ? Colors.mapStale : Colors.accent;

            const coord = animatedCoords[m.user_id] ?? {
              latitude: m.location.latitude,
              longitude: m.location.longitude,
            };

            return (
              <Marker.Animated
                key={m.user_id}
                coordinate={coord}
                onPress={() => setSelectedMemberId(m.user_id)}
                zIndex={isMe ? 10 : isSelected ? 9 : 5}
                tracksViewChanges={false}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={styles.pinWrapper}>
                  {isSelected && (
                    <View style={[styles.selectedRing, { borderColor: pinColor }]} />
                  )}
                  <View style={[
                    styles.pinBubble,
                    { backgroundColor: pinColor, width: isMe ? 52 : 44, height: isMe ? 52 : 44, borderRadius: isMe ? 26 : 22 }
                  ]}>
                    <Text style={[styles.pinInitials, { fontSize: isMe ? 18 : 15 }]}>
                      {hasSOS ? '🆘' : getInitials(m.profile.display_name)}
                    </Text>
                  </View>
                  <View style={[styles.pinTail, { borderTopColor: pinColor }]} />
                  <View style={[styles.pinLabel, isMe && { backgroundColor: Colors.primaryLight, borderColor: Colors.primary }]}>
                    <Text style={styles.pinLabelName} numberOfLines={1}>
                      {isMe ? 'Yo' : m.profile.display_name.split(' ')[0]}
                    </Text>
                    {m.location.battery_level != null && (
                      <Text style={styles.pinLabelBattery}>
                        {batteryIcon(m.location.battery_level, m.location.is_charging)} {m.location.battery_level}%
                      </Text>
                    )}
                  </View>
                  {isStale && !isMe && (
                    <Text style={styles.staleText}>{lastSeenShort(m.location.updated_at)}</Text>
                  )}
                </View>
              </Marker.Animated>
            );
          })}
      </MapView>

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{snapshot?.group?.emoji}</Text>
          <Text style={styles.headerName} numberOfLines={1}>{snapshot?.group?.name}</Text>
        </View>
        <Pressable onPress={refresh} hitSlop={12} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: Colors.primary }]}>↻</Text>
        </Pressable>
      </View>

      <View style={styles.fab}>
        <Pressable style={styles.fabBtn} onPress={fitToMembers}>
          <Text style={styles.fabIcon}>👥</Text>
        </Pressable>
        <Pressable style={styles.fabBtn} onPress={goToMyLocation}>
          <Text style={styles.fabIcon}>📍</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHandle} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelContent}>
          {(snapshot?.members ?? []).map(m => {
            const isSelected = m.user_id === selectedMemberId;
            const isMe = m.user_id === currentUserId;
            return (
              <Pressable
                key={m.user_id}
                style={[styles.chip, isSelected && styles.chipSelected, isMe && styles.chipMe]}
                onPress={() => {
                  setSelectedMemberId(m.user_id);
                  if (m.location && !m.is_invisible) {
                    mapRef.current?.animateToRegion({
                      latitude: m.location.latitude,
                      longitude: m.location.longitude,
                      latitudeDelta: 0.003,
                      longitudeDelta: 0.003
                    }, 500);
                  }
                }}
              >
                <View style={[styles.chipAvatar, { backgroundColor: isMe ? Colors.primary : Colors.accent }]}>
                  <Text style={styles.chipAvatarText}>{getInitials(m.profile.display_name)}</Text>
                </View>
                <View style={styles.chipInfo}>
                  <Text style={styles.chipName} numberOfLines={1}>
                    {isMe ? 'Yo' : m.profile.display_name.split(' ')[0]}
                  </Text>
                  {m.is_invisible ? (
                    <Text style={styles.chipStatus}>Invisible</Text>
                  ) : m.location ? (
                    <Text style={styles.chipStatus}>
                      {batteryIcon(m.location.battery_level, m.location.is_charging)}{' '}
                      {m.location.battery_level ?? '--'}% · {lastSeenShort(m.location.updated_at)}
                    </Text>
                  ) : (
                    <Text style={[styles.chipStatus, { color: Colors.danger }]}>Sin ubicacion</Text>
                  )}
                </View>
                {m.active_sos && <Text style={styles.chipSOS}>🆘</Text>}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, gap: Spacing.md },
  loadingText: { ...Typography.body, color: Colors.textSoft },
  errorText: { ...Typography.body, color: Colors.danger, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  retryText: { ...Typography.bodyBold, color: '#fff' },
  pinWrapper: { alignItems: 'center' },
  selectedRing: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, top: -10, opacity: 0.4 },
  pinBubble: { borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Shadows.floating },
  pinInitials: { color: '#fff', fontWeight: '800' },
  pinTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  pinLabel: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, marginTop: 2, maxWidth: 110, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  pinLabelName: { fontSize: 11, fontWeight: '700', color: Colors.text },
  pinLabelBattery: { fontSize: 10, color: Colors.textSoft },
  staleText: { fontSize: 10, color: Colors.mapStale, marginTop: 1 },
  header: { position: 'absolute', top: 44, left: Spacing.lg, right: Spacing.lg, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, ...Shadows.floating },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: Colors.surfaceAlt },
  headerBtnText: { fontSize: 18, color: Colors.text, fontWeight: '700' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  headerEmoji: { fontSize: 18 },
  headerName: { ...Typography.h3, color: Colors.text },
  fab: { position: 'absolute', right: Spacing.lg, bottom: 160, gap: Spacing.sm },
  fabBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.floating },
  fabIcon: { fontSize: 22 },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, ...Shadows.floating },
  panelHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  panelContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minWidth: 140, borderWidth: 1.5, borderColor: 'transparent' },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipMe: { borderColor: Colors.primary + '55' },
  chipAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chipAvatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  chipInfo: { flex: 1 },
  chipName: { ...Typography.bodyBold, color: Colors.text, fontSize: 13 },
  chipStatus: { ...Typography.small, color: Colors.textSoft, marginTop: 1 },
  chipSOS: { fontSize: 18 }
});