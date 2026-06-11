// 📁 cercania/app-scaffold/app/biometric-gate.tsx
/**
 * Pantalla de bloqueo biométrico.
 * Aparece cuando el usuario tiene biometría activada y abre la app.
 * No es navegable hacia atrás: solo se sale autenticándose o cerrando sesión.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Button } from '../src/components/ui/Button';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { Colors, Spacing, Typography } from '../src/lib/theme';
import { authenticateBiometric, getBiometricCapabilities } from '../src/services/biometric.service';
import { useAuth } from '../src/store/auth';

export default function BiometricGateScreen() {
  const closeGate = useAuth(s => s.closeBiometricGate);
  const signOut = useAuth(s => s.signOut);
  const profile = useAuth(s => s.profile);
  const [icon, setIcon] = useState('🔒');
  const [trying, setTrying] = useState(false);

  useEffect(() => {
    getBiometricCapabilities().then(c => {
      if (c.types.includes('face')) setIcon('😊');
      else if (c.types.includes('fingerprint')) setIcon('👆');
      else setIcon('🔒');
    }).catch(() => {});
  }, []);

  const tryUnlock = useCallback(async () => {
    if (trying) return;
    setTrying(true);
    try {
      const ok = await authenticateBiometric({
        reason: 'Desbloquea Cercanía para ver a tu familia'
      });
      if (ok) closeGate();
    } catch (e: any) {
      Alert.alert('No se pudo verificar', e.message);
    } finally {
      setTrying(false);
    }
  }, [trying, closeGate]);

  // Lanzar prompt automáticamente al abrir la pantalla
  useFocusEffect(useCallback(() => { tryUnlock(); }, [tryUnlock]));

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres cerrar sesión? Tendrás que iniciarla con tu contraseña.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: signOut }
      ]
    );
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.center}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>Cercanía está bloqueada</Text>
        <Text style={styles.subtitle}>
          {profile ? `Hola, ${profile.display_name.split(' ')[0]}.` : 'Hola.'}{'\n'}
          Verifica tu identidad para continuar.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Desbloquear"
          variant="primary"
          size="lg"
          fullWidth
          loading={trying}
          onPress={tryUnlock}
        />
        <Button
          title="Cerrar sesión"
          variant="ghost"
          size="md"
          fullWidth
          onPress={handleSignOut}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 96, marginBottom: Spacing.lg },
  title: { ...Typography.h1, color: Colors.text, textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.textSoft, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22 },
  actions: { gap: Spacing.sm, marginBottom: Spacing.md }
});
