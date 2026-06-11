// 📁 cercania/app-scaffold/app/(auth)/login.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { GoogleButton } from '../../src/components/ui/GoogleButton';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../src/lib/theme';
import { useAuth } from '../../src/store/auth';
import { signInWithGoogle, configureGoogleSignIn } from '../../src/services/google-auth.service';
import { getSupabase } from '../../src/lib/supabase';

configureGoogleSignIn();
const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const setSession = useAuth(s => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass] = useState(false);

  const headerAnim = useRef(new Animated.Value(-30)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(formAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 200);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const sb = await getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      await setSession(data.session);
    } catch (e: any) {
      alert(e.message);
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const data = await signInWithGoogle();
      await setSession(data.session);
    } catch (e: any) {
      if (e.code !== 'SIGN_IN_CANCELLED') alert(e.message);
    } finally { setGoogleLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Header con gradiente */}
        <Animated.View style={[styles.header, { transform: [{ translateY: headerAnim }], opacity: headerOpacity }]}>
          <View style={styles.headerBg} />
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={styles.headerIllustration}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>📍</Text>
            </View>
            <View style={[styles.iconCircleSmall, { top: 10, right: 30, backgroundColor: Colors.accentLight }]}>
              <Text style={{ fontSize: 16 }}>👨‍👩‍👧</Text>
            </View>
            <View style={[styles.iconCircleSmall, { bottom: 15, left: 40, backgroundColor: Colors.primaryLight }]}>
              <Text style={{ fontSize: 14 }}>🔐</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>¡Bienvenido{'\n'}de vuelta!</Text>
          <Text style={styles.headerSub}>Inicia sesión para ver a tu familia</Text>
        </Animated.View>

        {/* Formulario */}
        <Animated.View style={[styles.form, { transform: [{ translateY: formAnim }], opacity: formOpacity }]}>

          {/* Google */}
          <GoogleButton onPress={handleGoogle} loading={googleLoading} label="Continuar con Google" />

          {/* Divisor */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o continúa con correo</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          <View style={[styles.inputCard, focusEmail && styles.inputCardFocus]}>
            <View style={styles.inputIconBox}>
              <Text style={styles.inputIcon}>✉️</Text>
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="tu@correo.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusEmail(true)}
                onBlur={() => setFocusEmail(false)}
              />
            </View>
          </View>

          {/* Password */}
          <View style={[styles.inputCard, focusPass && styles.inputCardFocus]}>
            <View style={styles.inputIconBox}>
              <Text style={styles.inputIcon}>🔒</Text>
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Tu contraseña"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
              />
            </View>
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

          <Button title="Iniciar sesión" variant="primary" size="lg" fullWidth loading={loading} onPress={handleLogin} style={{ marginTop: Spacing.md }} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <Pressable onPress={() => router.replace('/(auth)/register')}>
              <Text style={styles.footerLink}>Regístrate gratis</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/(auth)/recovery-social')} style={styles.recoveryBtn}>
            <Text style={styles.recoveryText}>¿Perdiste acceso a tu cuenta?</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: Spacing.xxxl },

  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl, paddingTop: 52, minHeight: 260, position: 'relative', overflow: 'hidden' },
  headerBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.bgAlt,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg, ...Shadows.card
  },
  backIcon: { fontSize: 18, color: Colors.text, fontWeight: '700' },
  headerIllustration: { position: 'absolute', right: 20, top: 52 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    ...Shadows.glow
  },
  iconEmoji: { fontSize: 36 },
  iconCircleSmall: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', ...Shadows.card
  },
  headerTitle: { ...Typography.h1, color: Colors.text, marginTop: Spacing.sm, fontSize: 30, fontWeight: '900' },
  headerSub: { ...Typography.body, color: Colors.textSoft, marginTop: Spacing.xs },

  form: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },

  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.small, color: Colors.textMuted, fontWeight: '600' },

  inputCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    marginBottom: Spacing.md, paddingRight: Spacing.md,
    ...Shadows.card
  },
  inputCardFocus: { borderColor: Colors.primary, ...Shadows.glow },
  inputIconBox: {
    width: 52, height: 56, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceBlue, borderTopLeftRadius: Radius.lg - 1,
    borderBottomLeftRadius: Radius.lg - 1
  },
  inputIcon: { fontSize: 20 },
  inputContent: { flex: 1, paddingVertical: Spacing.sm },
  inputLabel: { ...Typography.small, color: Colors.textMuted, marginBottom: 2, fontWeight: '600' },
  input: { ...Typography.bodyBold, color: Colors.text, padding: 0 },
  eyeBtn: { padding: Spacing.sm },
  eyeIcon: { fontSize: 18 },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: Spacing.sm },
  forgotText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { ...Typography.body, color: Colors.textSoft },
  footerLink: { ...Typography.bodyBold, color: Colors.primary },

  recoveryBtn: { alignItems: 'center', marginTop: Spacing.lg, paddingVertical: Spacing.sm },
  recoveryText: { ...Typography.caption, color: Colors.textMuted, textDecorationLine: 'underline' }
});