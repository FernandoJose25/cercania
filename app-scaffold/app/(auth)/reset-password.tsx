// 📁 cercania/app-scaffold/app/(auth)/reset-password.tsx
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { PasswordStrength } from '../../src/components/auth/PasswordStrength';
import { Colors, Spacing, Typography } from '../../src/lib/theme';
import { validatePassword, validatePasswordConfirm } from '../../src/utils/validation';
import { humanizeAuthError } from '../../src/utils/format';
import { updatePassword, signOut } from '../../src/services/auth.service';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleReset = async () => {
    const newErrors: Record<string, string> = {};
    const p = validatePassword(password);
    if (!p.valid) newErrors.password = p.error!;
    const c = validatePasswordConfirm(password, confirm);
    if (!c.valid) newErrors.confirm = c.error!;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      await updatePassword(password);
      // Por seguridad cerramos esta sesión "de recuperación" para que vuelva a entrar
      await signOut();
      Alert.alert(
        'Contraseña actualizada',
        'Inicia sesión con tu nueva contraseña.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (e: any) {
      Alert.alert('Error', humanizeAuthError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.emoji}>🔑</Text>
      <Text style={styles.title}>Nueva contraseña</Text>
      <Text style={styles.subtitle}>
        Elige una contraseña segura. La usarás para entrar a Cercanía.
      </Text>

      <View style={styles.form}>
        <Input
          label="Nueva contraseña"
          placeholder="Mínimo 8 caracteres"
          isPassword
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />
        <PasswordStrength password={password} />

        <Input
          label="Confirmar contraseña"
          placeholder="Repite la contraseña"
          isPassword
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
        />
      </View>

      <Button
        title="Guardar contraseña"
        variant="primary"
        size="lg"
        fullWidth
        loading={submitting}
        onPress={handleReset}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 56, textAlign: 'center', marginTop: Spacing.xl },
  title: { ...Typography.h1, color: Colors.text, textAlign: 'center', marginTop: Spacing.md },
  subtitle: { ...Typography.body, color: Colors.textSoft, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  form: { marginBottom: Spacing.lg }
});
