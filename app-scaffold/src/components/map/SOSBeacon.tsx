// 📁 cercania/app-scaffold/src/components/map/SOSBeacon.tsx
/**
 * Baliza animada para alertas SOS activas.
 * Muestra un círculo rojo pulsante en el mapa.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MarkerView } from '@rnmapbox/maps';
import { Colors } from '../../lib/theme';

interface Props {
  userId: string;
  latitude: number;
  longitude: number;
  userName: string;
}

export function SOSBeacon({ userId, latitude, longitude, userName }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [pulse]);

  return (
    <MarkerView
      id={`sos-${userId}`}
      coordinate={[longitude, latitude]}
      allowOverlap
    >
      <View style={styles.wrapper}>
        <Animated.View
          style={[
            styles.ring,
            { transform: [{ scale: pulse }] }
          ]}
        />
        <View style={styles.dot}>
          <Text style={styles.icon}>🆘</Text>
        </View>
        <View style={styles.label}>
          <Text style={styles.labelText}>¡{userName} necesita ayuda!</Text>
        </View>
      </View>
    </MarkerView>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  ring: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.danger,
    opacity: 0.3
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff'
  },
  icon: { fontSize: 22 },
  label: {
    backgroundColor: Colors.danger,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4
  },
  labelText: { color: '#fff', fontSize: 11, fontWeight: '700' }
});
