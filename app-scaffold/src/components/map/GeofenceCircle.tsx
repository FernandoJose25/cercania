// 📁 cercania/app-scaffold/src/components/map/GeofenceCircle.tsx
/**
 * Círculo de geofence en el mapa.
 * Muestra la zona con un círculo semitransparente y un marcador central.
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { MarkerView, CircleLayer, ShapeSource } from '@rnmapbox/maps';
import { Geofence } from '../../types/index';
import { Colors, Typography } from '../../lib/theme';

interface Props {
  geofence: Geofence;
}

export function GeofenceCircle({ geofence }: Props) {
  const circleId = `geofence-${geofence.id}`;

  // GeoJSON point para el ShapeSource
  const geojson: GeoJSON.Feature = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [geofence.longitude, geofence.latitude]
    },
    properties: {}
  };

  return (
    <>
      {/* Círculo de área */}
      <ShapeSource id={circleId} shape={geojson}>
        <CircleLayer
          id={`${circleId}-fill`}
          style={{
            circleRadius: geofence.radius_meters,
            circleColor: Colors.primary,
            circleOpacity: 0.08,
            circleStrokeWidth: 1.5,
            circleStrokeColor: Colors.primary,
            circleStrokeOpacity: 0.4,
            circlePitchAlignment: 'map',
            circleRadiusTransition: { duration: 300 }
          }}
        />
      </ShapeSource>

      {/* Marcador central con emoji y nombre */}
      <MarkerView
        id={`${circleId}-marker`}
        coordinate={[geofence.longitude, geofence.latitude]}
      >
        <View style={styles.badge}>
          <Text style={styles.emoji}>{geofence.emoji}</Text>
          <Text style={styles.name}>{geofence.name}</Text>
        </View>
      </MarkerView>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border
  },
  emoji: { fontSize: 14 },
  name: { ...Typography.small, fontWeight: '600', color: Colors.text }
});
