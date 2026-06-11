// 📁 cercania/app-scaffold/app/(auth)/welcome.tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../src/lib/theme';

const { width, height } = Dimensions.get('window');

// Ilustración de pines familiares animados
function FamilyIllustration() {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true })
    ]).start();

    const makeFloat = (val: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(val, { toValue: -12, duration: 1800, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(val, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ]));

    makeFloat(float1, 0).start();
    makeFloat(float2, 400).start();
    makeFloat(float3, 800).start();
  }, []);

  const Pin = ({ emoji, color, size, x, y, float }: any) => (
    <Animated.View style={[styles.pin, { left: x, top: y, transform: [{ translateY: float }, { scale }] }]}>
      <View style={[styles.pinBubble, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ fontSize: size * 0.42 }}>{emoji}</Text>
      </View>
      <View style={[styles.pinTail, { borderTopColor: color }]} />
      <View style={[styles.pingRing, { width: size + 16, height: size + 16, borderRadius: (size + 16) / 2, borderColor: color }]} />
    </Animated.View>
  );

  return (
    <Animated.View style={[styles.illustration, { opacity }]}>
      {/* Círculos decorativos de fondo */}
      <View style={[styles.bgCircle, { width: 280, height: 280, backgroundColor: Colors.primaryLight, top: 0, left: 20 }]} />
      <View style={[styles.bgCircle, { width: 180, height: 180, backgroundColor: Colors.accentLight, top: 60, right: 10 }]} />
      <View style={[styles.bgCircle, { width: 120, height: 120, backgroundColor: Colors.primaryLight, bottom: 20, left: 60 }]} />

      {/* Mapa simulado */}
      <View style={styles.mapCard}>
        <View style={styles.mapGrid}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={styles.mapLine} />
          ))}
        </View>

        <Pin emoji="👩" color={Colors.primary} size={56} x={40} y={30} float={float1} />
        <Pin emoji="👨" color={Colors.accentDark} size={48} x={140} y={70} float={float2} />
        <Pin emoji="👧" color="#8B5CF6" size={44} x={80} y={110} float={float3} />

        {/* Líneas de conexión */}
        <View style={[styles.connectionLine, { top: 58, left: 68, width: 80, transform: [{ rotate: '20deg' }] }]} />
        <View style={[styles.connectionLine, { top: 94, left: 108, width: 60, transform: [{ rotate: '-30deg' }] }]} />
      </View>
    </Animated.View>
  );
}

// Indicadores de página
function Dots({ active }: { active: number }) {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map(i => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

export default function WelcomeScreen() {
  const titleAnim = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(40)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 300);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(btnAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 700);
  }, []);

  return (
    <View style={styles.container}>
      {/* Fondo con gradiente simulado */}
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      {/* Ilustración */}
      <FamilyIllustration />

      {/* Contenido */}
      <Animated.View style={[styles.content, { transform: [{ translateY: titleAnim }], opacity: titleOpacity }]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>📍 Localización familiar</Text>
        </View>
        <Text style={styles.title}>Mantente{'\n'}cerca de{'\n'}los tuyos</Text>
        <Text style={styles.subtitle}>
          Ve dónde está tu familia en tiempo real, recibe alertas y mantén a todos seguros.
        </Text>
      </Animated.View>

      <Dots active={0} />

      <Animated.View style={[styles.buttons, { transform: [{ translateY: btnAnim }], opacity: btnOpacity }]}>
        <Button
          title="Crear cuenta"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.push('/(auth)/register')}
          icon="✨"
        />
        <Button
          title="Ya tengo cuenta"
          variant="outline"
          size="lg"
          fullWidth
          onPress={() => router.push('/(auth)/login')}
          style={{ marginTop: Spacing.md }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  bgTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: height * 0.55,
    backgroundColor: Colors.bgAlt,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
  },
  bgBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.45, backgroundColor: Colors.bg },

  illustration: { height: height * 0.46, justifyContent: 'center', alignItems: 'center', marginTop: 48 },
  bgCircle: { position: 'absolute', opacity: 0.6, borderRadius: 999 },
  mapCard: {
    width: 240, height: 180, backgroundColor: Colors.surface,
    borderRadius: Radius.xl, overflow: 'hidden',
    ...Shadows.floating, borderWidth: 1, borderColor: Colors.borderBlue
  },
  mapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.07 },
  mapLine: { flex: 1, borderBottomWidth: 1, borderBottomColor: Colors.primary },
  pin: { position: 'absolute', alignItems: 'center' },
  pinBubble: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', ...Shadows.card },
  pinTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1
  },
  pingRing: {
    position: 'absolute', borderWidth: 2, opacity: 0.3,
    top: -8, alignSelf: 'center'
  },
  connectionLine: { position: 'absolute', height: 1.5, backgroundColor: Colors.borderBlue },

  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: Spacing.md
  },
  badgeText: { ...Typography.label, color: Colors.primary },
  title: { ...Typography.display, color: Colors.text, marginBottom: Spacing.md },
  subtitle: { ...Typography.body, color: Colors.textSoft, lineHeight: 24, maxWidth: 300 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: Spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.borderBlue },
  dotActive: { width: 22, backgroundColor: Colors.primary },

  buttons: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
});