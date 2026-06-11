// 📁 cercania/app-scaffold/app/(auth)/forgot-password.tsx
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Colors, Spacing, Typography } from '../../src/lib/theme';
import { validateEmail } from '../../src/utils/validation';
import { humanizeAuthError } from '../../src/utils/format';
import { requestPasswordReset } from '../../src/services/auth.service';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async () => {
    const check = validateEmail(email);
    if (!check.valid) { setError(check.error); return; }
    setError(undefined);

    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { email, flow: 'recovery' }
      });
    } catch (e: any) {
      Alert.alert('No se pudo enviar el código', humanizeAuthError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.emoji}>🔐</Text>
      <Text style={styles.title}>Recuperar contraseña</Text>
      <Text style={styles.subtitle}>
        Ingresa el correo de tu cuenta y te enviaremos un código para crear una nueva contraseña.
      </Text>

      <View style={styles.form}>
        <Input
          label="Correo electrónico"
          placeholder="tucorreo@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          error={error}
        />
      </View>

      <Button
        title="Enviar código"
        variant="primary"
        size="lg"
        fullWidth
        loading={submitting}
        onPress={handleSend}
      />

      <Pressable
        onPress={() => router.push('/(auth)/recovery-social')}
        style={styles.altLink}
        hitSlop={10}
      >
        <Text style={styles.altText}>
          ¿Ya no tienes acceso a este correo?{'\n'}
          <Text style={styles.altBold}>Recuperación con contactos de confianza</Text>
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
        <Text style={styles.backText}>← Volver al inicio de sesión</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 56, textAlign: 'center', marginTop: Spacing.xl },
  title: { ...Typography.h1, color: Colors.text, textAlign: 'center', marginTop: Spacing.md },
  subtitle: { ...Typography.body, color: Colors.textSoft, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 22 },
  form: { marginBottom: Spacing.lg },
  altLink: { marginTop: Spacing.xl, alignItems: 'center' },
  altText: { ...Typography.caption, color: Colors.textSoft, textAlign: 'center', lineHeight: 18 },
  altBold: { fontWeight: '700', color: Colors.primaryDark },
  back: { alignItems: 'center', marginTop: Spacing.lg },
  backText: { ...Typography.body, color: Colors.textSoft }
});
