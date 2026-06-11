import React, { useEffect, useRef } from 'react';
import {
  Animated, Dimensions, Easing, Image, StyleSheet, Text, View
} from 'react-native';

const { width, height } = Dimensions.get('window');

function LoadingDots() {
  const d1 = useRef(new Animated.Value(0.3)).current;
  const d2 = useRef(new Animated.Value(0.3)).current;
  const d3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (val: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        Animated.delay(760),
      ]));
    pulse(d1, 0).start();
    pulse(d2, 180).start();
    pulse(d3, 360).start();
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[d1, d2, d3].map((d, i) => (
        <Animated.View key={i} style={{
          width: i === 1 ? 20 : 8, height: 8, borderRadius: 4,
          backgroundColor: '#D97706', opacity: d,
        }} />
      ))}
    </View>
  );
}

export function AppSplashScreen() {
  // Logo
  const logoScale   = useRef(new Animated.Value(0.25)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat   = useRef(new Animated.Value(0)).current;

  // Rings pulsantes alrededor del logo
  const ring1 = useRef(new Animated.Value(0.85)).current;
  const ring2 = useRef(new Animated.Value(0.7)).current;

  // Texto
  const titleY       = useRef(new Animated.Value(28)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subY         = useRef(new Animated.Value(18)).current;
  const subOpacity   = useRef(new Animated.Value(0)).current;

  // Puntos decorativos
  const dot1Scale = useRef(new Animated.Value(0)).current;
  const dot2Scale = useRef(new Animated.Value(0)).current;
  const dot3Scale = useRef(new Animated.Value(0)).current;

  // Blobs de fondo
  const blobOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Blobs de fondo aparecen primero
    Animated.timing(blobOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Logo entra con spring pop
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    // Rings pulsantes del logo
    setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(ring1, { toValue: 1.35, duration: 1300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ring1, { toValue: 0.85, duration: 1300, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.delay(400),
        Animated.timing(ring2, { toValue: 1.6, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 0.7, duration: 1600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])).start();
    }, 500);

    // Logo flota suavemente
    setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(logoFloat, { toValue: -14, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoFloat, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start();
    }, 700);

    // Título entra
    Animated.sequence([
      Animated.delay(550),
      Animated.parallel([
        Animated.timing(titleY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
    ]).start();

    // Subtítulo entra
    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(subY, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(subOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();

    // Puntos decorativos aparecen escalonados
    const dotIn = (val: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(val, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }),
      ]);
    dotIn(dot1Scale, 650).start();
    dotIn(dot2Scale, 800).start();
    dotIn(dot3Scale, 950).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* Blobs decorativos de fondo */}
      <Animated.View style={{ opacity: blobOpacity }}>
        <View style={[styles.blob, { width: 340, height: 340, top: -100, left: -90, backgroundColor: '#FDE68A', opacity: 0.55 }]} />
        <View style={[styles.blob, { width: 220, height: 220, bottom: 40, right: -70, backgroundColor: '#FCD34D', opacity: 0.3 }]} />
        <View style={[styles.blob, { width: 150, height: 150, bottom: 180, left: -50, backgroundColor: '#FBBF24', opacity: 0.2 }]} />
      </Animated.View>

      {/* Puntos decorativos flotantes */}
      <Animated.View style={[styles.decoDot, { top: height * 0.17, left: width * 0.1, transform: [{ scale: dot1Scale }] }]} />
      <Animated.View style={[styles.decoDot, { top: height * 0.23, right: width * 0.12, width: 10, height: 10, borderRadius: 5, transform: [{ scale: dot2Scale }] }]} />
      <Animated.View style={[styles.decoDot, { bottom: height * 0.2, right: width * 0.22, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FBBF24', transform: [{ scale: dot3Scale }] }]} />

      {/* Centro */}
      <View style={styles.center}>
        {/* Logo con rings */}
        <Animated.View style={{
          transform: [{ scale: logoScale }, { translateY: logoFloat }],
          opacity: logoOpacity,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
        }}>
          {/* Ring exterior pulsante */}
          <Animated.View style={[styles.ring, {
            width: 160, height: 160, borderRadius: 80,
            borderColor: 'rgba(245,158,11,0.18)',
            transform: [{ scale: ring2 }],
          }]} />
          {/* Ring interior pulsante */}
          <Animated.View style={[styles.ring, {
            width: 140, height: 140, borderRadius: 70,
            borderColor: 'rgba(245,158,11,0.28)',
            transform: [{ scale: ring1 }],
          }]} />
          {/* Caja del logo */}
          <View style={styles.logoBox}>
            <Image
              source={require('../../../assets/logo-cercania.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Nombre */}
        <Animated.Text style={[styles.title, {
          transform: [{ translateY: titleY }],
          opacity: titleOpacity,
        }]}>
          Cercanía
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.sub, {
          transform: [{ translateY: subY }],
          opacity: subOpacity,
        }]}>
          Mantén a tu familia siempre cerca
        </Animated.Text>
      </View>

      {/* Dots de carga abajo */}
      <Animated.View style={[styles.dotsRow, { opacity: subOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  decoDot: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  logoBox: {
    width: 136,
    height: 136,
    borderRadius: 34,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 18,
  },
  logoImg: {
    width: 104,
    height: 104,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  sub: {
    fontSize: 16,
    color: '#92400E',
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.85,
    paddingHorizontal: 32,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 72,
  },
});
