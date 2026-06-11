// 📁 cercania/app-scaffold/app/(auth)/welcome.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../src/lib/theme';
import { GoogleButton } from '../../src/components/ui/GoogleButton';
import { useAuth } from '../../src/store/auth';
import { signInWithGoogle, configureGoogleSignIn } from '../../src/services/google-auth.service';

configureGoogleSignIn();
const { height } = Dimensions.get('window');

function MapIllustration() {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    const makeFloat = (val: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(val, { toValue: -10, duration: 1900, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(val, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ]));
    makeFloat(float1, 0).start();
    makeFloat(float2, 450).start();
    makeFloat(float3, 900).start();
  }, []);

  const Pin = ({ emoji, color, size, x, y, float }: any) => (
    <Animated.View style={[styles.pin, { left: x, top: y, transform: [{ translateY: float }] }]}>
      <View style={[styles.pinBubble, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ fontSize: size * 0.42 }}>{emoji}</Text>
      </View>
      <View style={[styles.pinTail, { borderTopColor: color }]} />
      <View style={[styles.pingRing, { width: size + 14, height: size + 14, borderRadius: (size + 14) / 2, borderColor: color }]} />
    </Animated.View>
  );

  return (
    <Animated.View style={[styles.illustrationWrap, { opacity: fadeIn }]}>
      {/* Blobs de fondo */}
      <View style={[styles.blob, { width: 280, height: 280, backgroundColor: Colors.primaryLight, top: -40, left: -30 }]} />
      <View style={[styles.blob, { width: 160, height: 160, backgroundColor: '#FDE68A', top: 60, right: -20, opacity: 0.5 }]} />

      {/* Tarjeta de mapa */}
      <View style={styles.mapCard}>
        <View style={styles.mapGrid}>
          {[...Array(5)].map((_, i) => <View key={i} style={styles.mapLine} />)}
        </View>
        <Pin emoji="👩" color={Colors.primary} size={52} x={28} y={22} float={float1} />
        <Pin emoji="👧" color="#8B5CF6" size={44} x={130} y={52} float={float2} />
        <Pin emoji="👨" color={Colors.accent} size={46} x={72} y={98} float={float3} />
        <View style={[styles.connLine, { top: 50, left: 56, width: 82, transform: [{ rotate: '18deg' }] }]} />
        <View style={[styles.connLine, { top: 88, left: 100, width: 58, transform: [{ rotate: '-28deg' }] }]} />
        {/* Badge en vivo */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>En vivo</Text>
        </View>
      </View>

      {/* Float cards */}
      <View style={[styles.floatCard, { top: 16, right: 8 }]}>
        <Text style={{ fontSize: 20 }}>🆘</Text>
        <Text style={styles.floatLabel}>SOS</Text>
      </View>
      <View style={[styles.floatCard, { bottom: 24, left: 4 }]}>
        <Text style={{ fontSize: 20 }}>🔔</Text>
        <Text style={styles.floatLabel}>Alerta</Text>
      </View>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const setSession = useAuth(s => s.setSession);
  const [loading, setLoading] = useState(false);

  const contentAnim = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(24)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentAnim, { toValue: 0, duration: 550, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]).start();
    }, 350);
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(btnAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]).start();
    }, 700);
  }, []);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const data = await signInWithGoogle();
      await setSession(data.session);
    } catch (e: any) {
      if (e.code !== 'SIGN_IN_CANCELLED') alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.bgTop} />

      <MapIllustration />

      <Animated.View style={[styles.content, { transform: [{ translateY: contentAnim }], opacity: contentOpacity }]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>📍 Localización familiar</Text>
        </View>
        <Text style={styles.title}>Mantente{'\n'}cerca de{'\n'}los tuyos</Text>
        <Text style={styles.subtitle}>
          Comparte tu ubicación en tiempo real. Alertas SOS, zonas seguras y privacidad total.
        </Text>
        <View style={styles.pillsRow}>
          {['📍 Tiempo real', '🆘 SOS', '🔒 Privado', '🔋 Eficiente'].map(f => (
            <View key={f} style={styles.pill}>
              <Text style={styles.pillText}>{f}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[styles.buttons, { transform: [{ translateY: btnAnim }], opacity: btnOpacity }]}>
        <GoogleButton onPress={handleGoogle} loading={loading} label="Continuar con Google" />
        <Text style={styles.termsText}>
          Al continuar aceptas nuestros{' '}
          <Text style={styles.termsLink}>Términos de uso</Text>
          {' '}y{' '}
          <Text style={styles.termsLink}>Política de privacidad</Text>
        </Text>
        <Pressable onPress={() => router.push('/(auth)/recovery-social')} style={styles.recoveryBtn}>
          <Text style={styles.recoveryText}>¿Perdiste acceso a tu cuenta?</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  bgTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.52,
    backgroundColor: Colors.bgAlt,
    borderBottomLeftRadius: 48, borderBottomRightRadius: 48,
  },

  illustrationWrap: { height: height * 0.46, justifyContent: 'center', alignItems: 'center', marginTop: 44 },
  blob: { position: 'absolute', borderRadius: 999, opacity: 0.65 },
  mapCard: {
    width: 240, height: 178, backgroundColor: Colors.surface, borderRadius: Radius.xl, overflow: 'hidden',
    borderWidth: 2, borderColor: '#FDE68A', ...Shadows.floating,
  },
  mapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.06 },
  mapLine: { flex: 1, borderBottomWidth: 1, borderBottomColor: Colors.primary },
  pin: { position: 'absolute', alignItems: 'center' },
  pinBubble: { alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#fff', ...Shadows.card },
  pinTail: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  pingRing: { position: 'absolute', borderWidth: 2, opacity: 0.25, top: -7, alignSelf: 'center' },
  connLine: { position: 'absolute', height: 1.5, backgroundColor: '#FDE68A' },
  liveBadge: {
    position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accentLight, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  liveText: { fontSize: 11, fontWeight: '700', color: Colors.accentDark },
  floatCard: {
    position: 'absolute', backgroundColor: Colors.surface, borderRadius: 16, padding: 10, alignItems: 'center',
    ...Shadows.card, borderWidth: 1, borderColor: Colors.border,
  },
  floatLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSoft, marginTop: 2 },

  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  badge: { alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 6, marginBottom: Spacing.md },
  badgeText: { ...Typography.label, color: Colors.primaryDark },
  title: { ...Typography.display, color: Colors.text, marginBottom: Spacing.md },
  subtitle: { ...Typography.body, color: Colors.textSoft, lineHeight: 23, marginBottom: Spacing.md },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: { backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: Colors.border },
  pillText: { ...Typography.small, fontWeight: '600', color: Colors.textSoft },

  buttons: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl, paddingTop: Spacing.lg },
  termsText: { ...Typography.small, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 18 },
  termsLink: { color: Colors.primary, fontWeight: '700' },
  recoveryBtn: { alignItems: 'center', marginTop: Spacing.lg, paddingVertical: Spacing.sm },
  recoveryText: { ...Typography.caption, color: Colors.textMuted, textDecorationLine: 'underline' },
});
