// 📁 cercania/app-scaffold/app/(auth)/register.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Platform,
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

// Indicador de fuerza de contraseña
function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };
  const strength = getStrength();
  if (!password) return null;
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  const colors = ['', Colors.danger, Colors.warning, Colors.accent, Colors.success];
  return (
    <View style={pwStyles.container}>
      <View style={pwStyles.bars}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={[pwStyles.bar, { backgroundColor: i <= strength ? colors[strength] : Colors.border }]} />
        ))}
      </View>
      <Text style={[pwStyles.label, { color: colors[strength] }]}>{labels[strength]}</Text>
    </View>
  );
}

const pwStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  bars: { flexDirection: 'row', gap: 4, flex: 1 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  label: { fontSize: 11, fontWeight: '700', minWidth: 40 }
});

export default function RegisterScreen() {
  const setSession = useAuth(s => s.setSession);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState('');

  const formAnim = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(formAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(formOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) return;
    if (password !== confirm) { alert('Las contraseñas no coinciden'); return; }
    if (password.length < 8) { alert('La contraseña debe tener al menos 8 caracteres'); return; }
    setLoading(true);
    try {
      const sb = await getSupabase();
      const { error } = await sb.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { display_name: displayName.trim() } }
      });
      if (error) throw error;
      router.replace({ pathname: '/(auth)/verify-otp', params: { email: email.trim().toLowerCase() } });
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
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

  const InputCard = ({ icon, label, value, onChange, placeholder, secure, keyboardType, autoCapitalize, name, extra }: any) => (
    <View style={[styles.inputCard, focused === name && styles.inputCardFocus]}>
      <View style={styles.inputIconBox}>
        <Text style={styles.inputIcon}>{icon}</Text>
      </View>
      <View style={styles.inputContent}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secure && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          onFocus={() => setFocused(name)}
          onBlur={() => setFocused('')}
        />
        {extra}
      </View>
      {secure && (
        <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8} style={styles.eyeBtn}>
          <Text>{showPassword ? '🙈' : '👁️'}</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBg} />
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>Paso 1 de 2</Text>
          </View>
          <Text style={styles.headerTitle}>Crea tu cuenta</Text>
          <Text style={styles.headerSub}>Únete a miles de familias que usan Cercanía</Text>
          {/* Stats */}
          <View style={styles.statsRow}>
            {[['📍', 'Tiempo real'], ['🔋', 'Batería'], ['🆘', 'SOS']].map(([emoji, label]) => (
              <View key={label} style={styles.statChip}>
                <Text style={styles.statEmoji}>{emoji}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Animated.View style={[styles.form, { transform: [{ translateY: formAnim }], opacity: formOpacity }]}>

          <GoogleButton onPress={handleGoogle} loading={googleLoading} label="Registrarse con Google" />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o con correo</Text>
            <View style={styles.dividerLine} />
          </View>

          <InputCard icon="👤" label="Nombre completo" value={displayName} onChange={setDisplayName}
            placeholder="Tu nombre" name="name" autoCapitalize="words" />
          <InputCard icon="✉️" label="Correo electrónico" value={email} onChange={setEmail}
            placeholder="tu@correo.com" name="email" keyboardType="email-address" />
          <InputCard icon="🔒" label="Contraseña" value={password} onChange={setPassword}
            placeholder="Mínimo 8 caracteres" name="password" secure
            extra={<PasswordStrength password={password} />} />
          <InputCard icon="✅" label="Confirmar contraseña" value={confirm} onChange={setConfirm}
            placeholder="Repite tu contraseña" name="confirm" secure />

          <Button title="Crear cuenta gratis" variant="lime" size="lg" fullWidth loading={loading}
            onPress={handleRegister} icon="🚀" style={{ marginTop: Spacing.lg }} />

          <Text style={styles.terms}>
            Al registrarte aceptas nuestros <Text style={styles.termsLink}>Términos de uso</Text> y{' '}
            <Text style={styles.termsLink}>Política de privacidad</Text>
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: Spacing.xxxl },
  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, paddingTop: 52, minHeight: 240, position: 'relative', overflow: 'hidden' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bgAlt, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, ...Shadows.card },
  backIcon: { fontSize: 18, color: Colors.text, fontWeight: '700' },
  stepBadge: { alignSelf: 'flex-start', backgroundColor: Colors.accentLight, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 4, marginBottom: Spacing.sm },
  stepText: { ...Typography.label, color: Colors.accentDark },
  headerTitle: { fontSize: 28, fontWeight: '900', color: Colors.text, marginBottom: Spacing.xs },
  headerSub: { ...Typography.body, color: Colors.textSoft, marginBottom: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5, ...Shadows.card },
  statEmoji: { fontSize: 12 },
  statLabel: { ...Typography.small, fontWeight: '600', color: Colors.text },
  form: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.small, color: Colors.textMuted, fontWeight: '600' },
  inputCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing.md, paddingRight: Spacing.md, ...Shadows.card },
  inputCardFocus: { borderColor: Colors.primary, ...Shadows.glow },
  inputIconBox: { width: 52, minHeight: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceBlue, borderTopLeftRadius: Radius.lg - 1, borderBottomLeftRadius: Radius.lg - 1 },
  inputIcon: { fontSize: 20 },
  inputContent: { flex: 1, paddingVertical: Spacing.sm },
  inputLabel: { ...Typography.small, color: Colors.textMuted, marginBottom: 2, fontWeight: '600' },
  input: { ...Typography.bodyBold, color: Colors.text, padding: 0 },
  eyeBtn: { padding: Spacing.sm },
  terms: { ...Typography.small, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
  termsLink: { color: Colors.primary, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { ...Typography.body, color: Colors.textSoft },
  footerLink: { ...Typography.bodyBold, color: Colors.primary },
});