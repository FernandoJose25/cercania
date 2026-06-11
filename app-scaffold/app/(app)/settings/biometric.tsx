// 📁 cercania/app-scaffold/app/(app)/settings/biometric.tsx
/**
 * Pantalla para activar o desactivar la biometría como protección al
 * abrir la app. Requiere verificación biométrica para hacer el cambio.
 */

import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Colors, Radius, Spacing, Typography } from '../../../src/lib/theme';
import {
  authenticateStrict,
  getBiometricCapabilities,
  BiometricCapabilities
} from '../../../src/services/biometric.service';
import { useAuth } from '../../../src/store/auth';
import { getSupabase } from '../../../src/lib/supabase';

export default function BiometricSettingsScreen() {
  const settings = useAuth(s => s.settings);
  const refresh = useAuth(s => s.refreshProfile);
  const userId = useAuth(s => s.user?.id);

  const [caps, setCaps] = useState<BiometricCapabilities | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBiometricCapabilities().then(setCaps).catch(() => setCaps(null));
  }, []);

  const handleToggle = async (value: boolean) => {
    if (!userId) return;

    if (value) {
      if (!caps?.available) {
        Alert.alert('No disponible', 'Tu dispositivo no soporta biometría.');
        return;
      }
      if (!caps.enrolled) {
        Alert.alert(
          'Configura primero la biometría',
          'Ve a los ajustes de tu sistema y registra tu huella o rostro.'
        );
        return;
      }
    }

    setBusy(true);
    try {
      const ok = await authenticateStrict(
        value ? 'Confirma activar biometría' : 'Confirma desactivar biometría'
      );
      if (!ok) { setBusy(false); return; }

      const sb = await getSupabase();
      const { error } = await sb
        .from('user_settings')
        .update({ biometric_enabled: value })
        .eq('user_id', userId);
      if (error) throw error;

      await refresh();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo actualizar');
    } finally {
      setBusy(false);
    }
  };

  const friendlyType = caps?.types.includes('face')
    ? 'Face ID / Reconocimiento facial'
    : caps?.types.includes('fingerprint')
    ? 'Huella digital'
    : 'Biometría';

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
        <Text style={styles.backText}>← Volver</Text>
      </Pressable>

      <Text style={styles.title}>Protección biométrica</Text>
      <Text style={styles.subtitle}>
        Pide tu huella o rostro al abrir la app. Nadie más podrá ver las ubicaciones de tu familia aunque tenga tu celular.
      </Text>

      {!caps?.available && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Tu dispositivo no soporta biometría.
          </Text>
        </View>
      )}

      {caps?.available && !caps.enrolled && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Configura tu huella o rostro en los ajustes del sistema antes de activarla aquí.
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Bloquear con {friendlyType}</Text>
          <Text style={styles.rowSub}>
            {settings?.biometric_enabled
              ? 'Te pediremos verificación al abrir Cercanía.'
              : 'La app se abre directo sin verificación.'}
          </Text>
        </View>
        <Switch
          value={!!settings?.biometric_enabled}
          onValueChange={handleToggle}
          disabled={busy || !caps?.available || !caps.enrolled}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipTitle}>💡 Tip</Text>
        <Text style={styles.tipText}>
          Si la app se queda en segundo plano y vuelves a abrirla, te pedirá tu huella otra vez.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { marginTop: Spacing.sm, marginBottom: Spacing.sm },
  backText: { ...Typography.body, color: Colors.textSoft },
  title: { ...Typography.h1, color: Colors.text, marginTop: Spacing.md },
  subtitle: { ...Typography.body, color: Colors.textSoft, marginTop: Spacing.sm, marginBottom: Spacing.lg, lineHeight: 22 },
  warning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg
  },
  warningText: { ...Typography.body, color: '#78350F' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg
  },
  rowTitle: { ...Typography.bodyBold, color: Colors.text },
  rowSub: { ...Typography.caption, color: Colors.textSoft, marginTop: 4 },
  tip: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg
  },
  tipTitle: { ...Typography.bodyBold, color: Colors.primaryDark },
  tipText: { ...Typography.caption, color: Colors.text, marginTop: 4, lineHeight: 18 }
});
