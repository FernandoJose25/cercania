// 📁 cercania/app-scaffold/app/(auth)/setup-trusted.tsx
/**
 * Pantalla que aparece justo después de confirmar la cuenta.
 * Aquí el usuario será invitado a configurar sus 3-5 contactos de confianza.
 *
 * En este Paso 3 dejamos la pantalla con la intro y un botón "Lo haré después"
 * para no bloquear el onboarding inicial (el usuario puede no tener aún
 * a sus contactos registrados en la app). La gestión completa de contactos
 * llega en el Paso 8.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Colors, Radius, Spacing, Typography } from '../../src/lib/theme';

export default function SetupTrustedScreen() {
  const goHome = () => router.replace('/(app)/home');

  return (
    <ScreenContainer>
      <Text style={styles.emoji}>🤝</Text>
      <Text style={styles.title}>Contactos de confianza</Text>
      <Text style={styles.subtitle}>
        Elige entre 3 y 5 personas que podrían ayudarte a recuperar tu cuenta si algún día pierdes acceso.
      </Text>

      <View style={styles.box}>
        <Text style={styles.boxTitle}>¿Por qué importa?</Text>
        <Text style={styles.boxText}>
          Si cambias de número, pierdes tu correo o te roban el celular, estos contactos podrán autorizar la recuperación de tu cuenta. Sin ellos, podrías perder el acceso para siempre.
        </Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.boxTitle}>¿Quiénes deberían ser?</Text>
        <Text style={styles.boxText}>
          Personas muy cercanas, que conoces en persona: padres, hermanos, hijos mayores, pareja, mejor amigo. Tienen que ser usuarios de Cercanía.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Configurar ahora"
          variant="primary"
          size="lg"
          fullWidth
          disabled
          onPress={() => { /* Se habilitará en el Paso 8 */ }}
        />
        <Text style={styles.disabledNote}>
          Disponible cuando agregues familia a la app
        </Text>

        <Button
          title="Lo haré después"
          variant="ghost"
          size="lg"
          fullWidth
          onPress={goHome}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 56, textAlign: 'center', marginTop: Spacing.lg },
  title: { ...Typography.h1, color: Colors.text, textAlign: 'center', marginTop: Spacing.md },
  subtitle: { ...Typography.body, color: Colors.textSoft, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl, paddingHorizontal: Spacing.md, lineHeight: 22 },
  box: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md
  },
  boxTitle: { ...Typography.bodyBold, color: Colors.text, marginBottom: Spacing.xs },
  boxText: { ...Typography.body, color: Colors.textSoft, lineHeight: 22 },
  actions: { marginTop: 'auto', gap: Spacing.sm, marginBottom: Spacing.md },
  disabledNote: { ...Typography.small, color: Colors.textMuted, textAlign: 'center', marginTop: -4 }
});
