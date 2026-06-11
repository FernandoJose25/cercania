// 📁 cercania/app-scaffold/app/(app)/permissions.tsx
/**
 * Pantalla de permisos de ubicación.
 * Se muestra la primera vez que el usuario entra a la app
 * o cuando revocan los permisos desde Ajustes del sistema.
 *
 * Flujo iOS: primero pide "Mientras usas la app" → luego "Siempre".
 * Flujo Android: un solo diálogo con la opción "Todo el tiempo".
 */

import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radius, Spacing, Typography } from '../../src/lib/theme';
import { useTracking } from '../../src/store/tracking';

export default function PermissionsScreen() {
  const requestPermissions = useTracking(s => s.requestPermissions);
  const permissions = useTracking(s => s.permissions);
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    setLoading(true);
    try {
      await requestPermissions();
      const perms = useTracking.getState().permissions;
      if (perms?.background) {
        router.replace('/(app)/home');
      } else if (!perms?.canAskAgain) {
        // El usuario denegó permanentemente → abrir Ajustes del sistema
        Alert.alert(
          'Permiso necesario',
          'Para que Cercanía funcione, ve a Ajustes del sistema y activa "Ubicación → Siempre" para esta app.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Puede usar la app sin rastreo pero con funciones limitadas
    router.replace('/(app)/home');
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.center}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>Ubicación en segundo plano</Text>
        <Text style={styles.subtitle}>
          Para que tu familia sepa dónde estás, Cercanía necesita acceder a tu ubicación{' '}
          <Text style={styles.bold}>incluso cuando la app esté cerrada</Text>.
        </Text>

        <View style={styles.infoBox}>
          <InfoRow icon="🔒" text="Solo tu grupo familiar puede ver tu ubicación." />
          <InfoRow icon="🔋" text="Modo inteligente que cuida la batería." />
          <InfoRow icon="👁️" text="Puedes pausar el rastreo cuando quieras." />
          <InfoRow icon="🗑️" text="Tu historial se borra automáticamente." />
        </View>

        {Platform.OS === 'ios' && (
          <View style={styles.iosNote}>
            <Text style={styles.iosNoteText}>
              iOS mostrará dos diálogos seguidos. En el segundo, elige{' '}
              <Text style={styles.bold}>"Siempre permitir"</Text>.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          title="Activar ubicación"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onPress={handleRequest}
        />
        <Pressable onPress={handleSkip} hitSlop={10} style={styles.skip}>
          <Text style={styles.skipText}>Ahora no (funciones limitadas)</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  emoji: { fontSize: 72, textAlign: 'center', marginBottom: Spacing.lg },
  title: { ...Typography.h1, color: Colors.text, textAlign: 'center' },
  subtitle: {
    ...Typography.body,
    color: Colors.textSoft,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    lineHeight: 22
  },
  bold: { fontWeight: '700', color: Colors.text },
  infoBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  infoIcon: { fontSize: 20, width: 28 },
  infoText: { ...Typography.body, color: Colors.text, flex: 1 },
  iosNote: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg
  },
  iosNoteText: { ...Typography.caption, color: Colors.primaryDark, lineHeight: 18 },
  actions: { gap: Spacing.sm, marginBottom: Spacing.md },
  skip: { alignItems: 'center', padding: Spacing.md },
  skipText: { ...Typography.body, color: Colors.textMuted }
});
