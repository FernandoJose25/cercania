// 📁 cercania/app-scaffold/app/(auth)/verify-otp.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  Animated, Pressable, StyleSheet, Text,
  TextInput, View, KeyboardAvoidingView, Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../src/lib/theme';
import { useAuth } from '../../src/store/auth';
import { getSupabase } from '../../src/lib/supabase';

const OTP_LENGTH = 8;

export default function VerifyOTPScreen() {
  const { email, flow } = useLocalSearchParams<{ email: string; flow?: string }>();
  const setSession = useAuth(s => s.setSession);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef<TextInput>(null);

  const iconAnim = useRef(new Animated.Value(0.5)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(iconAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const doShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) { doShake(); return; }
    setLoading(true);
    try {
      const sb = await getSupabase();
      const otpType = flow === 'recovery' ? 'recovery' : 'signup';
      const { data, error } = await sb.auth.verifyOtp({ email, token: otp, type: otpType });
      if (error) { doShake(); throw error; }
      if (flow === 'recovery') {
        router.replace('/(auth)/reset-password');
      } else {
        await setSession(data.session);
      }
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const sb = await getSupabase();
      const resendType = flow === 'recovery' ? 'recovery' : 'signup';
      await sb.auth.resend({ type: resendType, email } as any);
      setCountdown(60);
    } catch (e: any) { alert(e.message); } finally { setResending(false); }
  };

  // Renderizar los 8 dígitos del OTP visualmente
  const renderDigits = () => (
    <View style={styles.digitsRow}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => {
        const char = otp[i] ?? '';
        const isCurrent = i === otp.length;
        return (
          <Pressable key={i} onPress={() => inputRef.current?.focus()} style={[
            styles.digitBox,
            char && styles.digitBoxFilled,
            isCurrent && styles.digitBoxCurrent
          ]}>
            <Text style={styles.digitText}>{char || (isCurrent ? '|' : '')}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.headerBg} />

        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        {/* Icono animado */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconAnim }] }]}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>✉️</Text>
          </View>
          <View style={styles.iconRing} />
          <View style={styles.iconRing2} />
        </Animated.View>

        <Text style={styles.title}>Verifica tu correo</Text>
        <Text style={styles.subtitle}>
          Enviamos un código de <Text style={styles.boldText}>{OTP_LENGTH} dígitos</Text> a:
        </Text>
        <View style={styles.emailBadge}>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Input oculto */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          keyboardType="number-pad"
          style={styles.hiddenInput}
          maxLength={OTP_LENGTH}
        />

        {/* Dígitos visuales */}
        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          {renderDigits()}
        </Animated.View>

        <Pressable onPress={() => inputRef.current?.focus()}>
          <Text style={styles.tapHint}>Toca para escribir el código</Text>
        </Pressable>

        <Button
          title="Verificar código"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={otp.length !== OTP_LENGTH}
          onPress={handleVerify}
          style={styles.verifyBtn}
        />

        {/* Reenviar */}
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>¿No recibiste el código? </Text>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>Reenviar en {countdown}s</Text>
          ) : (
            <Pressable onPress={handleResend} disabled={resending}>
              <Text style={styles.resendLink}>{resending ? 'Enviando...' : 'Reenviar'}</Text>
            </Pressable>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>💡 Revisa tu carpeta de spam si no lo encuentras</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0A09', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 52 },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: '#1C1917', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  backBtn: { alignSelf: 'flex-start', width: 40, height: 40, borderRadius: 20, backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  backIcon: { fontSize: 18, color: '#FAFAF9', fontWeight: '700' },
  iconWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.glow },
  iconEmoji: { fontSize: 40 },
  iconRing: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: 'rgba(245,158,11,0.25)' },
  iconRing2: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderColor: 'rgba(245,158,11,0.12)' },
  title: { ...Typography.h1, color: '#FAFAF9', textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, color: '#A8A29E', textAlign: 'center' },
  boldText: { fontWeight: '700', color: '#FAFAF9' },
  emailBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 6, marginTop: Spacing.sm, marginBottom: Spacing.xl },
  emailText: { ...Typography.bodyBold, color: '#F59E0B' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  digitsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  digitBox: {
    width: 36, height: 48, borderRadius: Radius.md,
    backgroundColor: '#292524', borderWidth: 2, borderColor: '#3C3936',
    alignItems: 'center', justifyContent: 'center',
  },
  digitBoxFilled: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.12)' },
  digitBoxCurrent: { borderColor: '#F59E0B', borderWidth: 2.5 },
  digitText: { ...Typography.h2, color: '#F59E0B' },
  tapHint: { ...Typography.small, color: '#78716C', marginBottom: Spacing.xl },
  verifyBtn: { width: '100%' },
  resendRow: { flexDirection: 'row', marginTop: Spacing.lg },
  resendText: { ...Typography.body, color: '#A8A29E' },
  countdownText: { ...Typography.bodyBold, color: '#78716C' },
  resendLink: { ...Typography.bodyBold, color: '#F59E0B' },
  infoBox: { marginTop: Spacing.xl, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: Radius.lg, padding: Spacing.md, width: '100%', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  infoText: { ...Typography.caption, color: '#F59E0B', textAlign: 'center' },
});