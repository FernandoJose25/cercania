import React, { useEffect, useRef } from 'react';
import {
  Animated, Dimensions, Easing, Image, StyleSheet, Text, View
} from 'react-native';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function SplashScreenAnimated() {
  // Logo
  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat   = useRef(new Animated.Value(0)).current;

  // Texto
  const titleY       = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subY         = useRef(new Animated.Value(20)).current;
  const subOpacity   = useRef(new Animated.Value(0)).current;

  // Puntos decorativos
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // Salida
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo entra con pop
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 2. Título entra después del logo
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(titleY, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
    ]).start();

    // 3. Subtítulo entra después
    Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(subY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(subOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // 4. Puntos decorativos aparecen escalonados
    const dotAnim = (val: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(val, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
      ]);
    dotAnim(dot1, 700).start();
    dotAnim(dot2, 850).start();
    dotAnim(dot3, 1000).start();

    // 5. Logo flota suavemente en loop
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoFloat, { toValue: -12, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoFloat, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    }, 800);

    // 6. Navega al login con fade out
    setTimeout(() => {
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        router.replace('/(auth)/welcome');
      });
    }, 2800);
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: exitOpacity }]}>
      {/* Blobs decorativos de fondo */}
      <View style={[styles.blob, { width: 320, height: 320, top: -80, left: -80, backgroundColor: '#FDE68A', opacity: 0.5 }]} />
      <View style={[styles.blob, { width: 200, height: 200, bottom: 60, right: -60, backgroundColor: '#FCD34D', opacity: 0.3 }]} />
      <View style={[styles.blob, { width: 140, height: 140, bottom: 200, left: -40, backgroundColor: '#FBBF24', opacity: 0.2 }]} />

      {/* Puntos decorativos */}
      <Animated.View style={[styles.dot, { top: height * 0.18, left: width * 0.12, transform: [{ scale: dot1 }] }]} />
      <Animated.View style={[styles.dot, { top: height * 0.22, right: width * 0.14, width: 10, height: 10, borderRadius: 5, transform: [{ scale: dot2 }] }]} />
      <Animated.View style={[styles.dot, { bottom: height * 0.22, right: width * 0.2, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FBBF24', transform: [{ scale: dot3 }] }]} />

      {/* Centro */}
      <View style={styles.center}>
        {/* Logo */}
        <Animated.View style={{
          transform: [{ scale: logoScale }, { translateY: logoFloat }],
          opacity: logoOpacity,
          marginBottom: 28,
        }}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/logo-cercania.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Nombre */}
        <Animated.Text style={[styles.title, { transform: [{ translateY: titleY }], opacity: titleOpacity }]}>
          Cercanía
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.sub, { transform: [{ translateY: subY }], opacity: subOpacity }]}>
          Mantén a tu familia siempre cerca
        </Animated.Text>
      </View>

      {/* Puntos de carga en la parte baja */}
      <Animated.View style={[styles.dotsRow, { opacity: subOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </Animated.View>
  );
}

function LoadingDots() {
  const d1 = useRef(new Animated.Value(0.3)).current;
  const d2 = useRef(new Animated.Value(0.3)).current;
  const d3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (val: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.delay(800),
      ]));
    pulse(d1, 0).start();
    pulse(d2, 200).start();
    pulse(d3, 400).start();
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[d1, d2, d3].map((d, i) => (
        <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#D97706', opacity: d }} />
      ))}
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
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 140,
    height: 140,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  logo: {
    width: 110,
    height: 110,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sub: {
    fontSize: 16,
    color: '#92400E',
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.85,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 80,
  },
});
