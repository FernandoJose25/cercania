// 📁 cercania/app-scaffold/src/components/map/MemberPin.tsx
/**
 * Pin de miembro en el mapa.
 * Muestra: foto/iniciales, nombre, batería, tiempo desde última actualización.
 * Se vuelve gris ("stale") si hace más de 15 minutos sin actualización.
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image
} from 'react-native';
import { MarkerView } from '@rnmapbox/maps';
import { Colors, Radius, Typography } from '../../lib/theme';
import { Profile, Location } from '../../types/index';
import { getInitials, lastSeenShort, batteryIcon } from '../../utils/format';
import { Tracking } from '../../lib/theme';

interface Props {
  userId: string;
  profile: Profile;
  location: Location | null;
  isInvisible: boolean;
  isCurrentUser?: boolean;
  onPress?: () => void;
}

export function MemberPin({
  userId,
  profile,
  location,
  isInvisible,
  isCurrentUser,
  onPress
}: Props) {
  const isStale = useMemo(() => {
    if (!location) return true;
    const diff = Date.now() - new Date(location.updated_at).getTime();
    return diff > Tracking.staleAfterMin * 60 * 1000;
  }, [location]);

  if (!location || isInvisible) return null;

  const pinColor = isCurrentUser
    ? Colors.primary
    : isStale
    ? Colors.mapStale
    : Colors.accent;

  const initials = getInitials(profile.display_name);

  return (
    <MarkerView
      id={userId}
      coordinate={[location.longitude, location.latitude]}
      allowOverlap
    >
      <View style={styles.wrapper} onTouchEnd={onPress}>
        {/* Burbuja principal */}
        <View style={[styles.bubble, { borderColor: pinColor }]}>
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.initialsBox, { backgroundColor: pinColor }]}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
        </View>

        {/* Punta del pin */}
        <View style={[styles.tail, { borderTopColor: pinColor }]} />

        {/* Etiqueta inferior */}
        <View style={[styles.label, { borderColor: pinColor }]}>
          <Text style={styles.labelName} numberOfLines={1}>
            {profile.display_name.split(' ')[0]}
          </Text>
          {location.battery_level != null && (
            <Text style={styles.labelBattery}>
              {batteryIcon(location.battery_level, location.is_charging)}{' '}
              {location.battery_level}%
            </Text>
          )}
        </View>

        {/* Indicador stale */}
        {isStale && (
          <Text style={styles.staleText}>
            {lastSeenShort(location.updated_at)}
          </Text>
        )}
      </View>
    </MarkerView>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  bubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: Colors.surface
  },
  avatar: { width: '100%', height: '100%' },
  initialsBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  initials: { color: '#fff', ...Typography.bodyBold, fontSize: 16 },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    gap: 4
  },
  labelName: { ...Typography.small, fontWeight: '700', color: Colors.text, maxWidth: 70 },
  labelBattery: { ...Typography.small, color: Colors.textSoft },
  staleText: { ...Typography.small, color: Colors.mapStale, marginTop: 2 }
});
