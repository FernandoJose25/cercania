// 📁 cercania/app-scaffold/app/(auth)/recovery-social.tsx
/**
 * Pantalla de recuperación social.
 * Para usuarios que perdieron acceso a su email y contraseña.
 */
import React, { useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radius, Spacing, Typography } from '../../src/lib/theme';
import { getSupabase } from '../../src/lib/supabase';

type Step = 'email' | 'waiting';

export default function RecoverySocialScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const startRecovery = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const sb = await getSupabase();
      // La respuesta es la misma exista o no la cuenta, para no revelar qué correos están registrados.
      const { error } = await sb.rpc('create_recovery_request', { p_email: email.trim().toLowerCase() });
      if (error) throw error;
      setStep('waiting');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancelar una recuperación exige sesión: sin ella, cualquiera que supiera
  // el correo podía bloquear la recuperación de otra persona.
  const showPanicHelp = () => {
    Alert.alert(
      '¿Alguien intenta entrar a tu cuenta?',
      'Inicia sesión y cancélala en Ajustes → Contactos de confianza. Si no recuerdas tu contraseña, restablécela con tu correo.',
      [
        { text: 'Cerrar', style: 'cancel' },
        { text: 'Iniciar sesión', onPress: () => router.replace('/(auth)/login') }
      ]
    );
  };

  if (step === 'waiting') {
    return (
      <View style={styles.container}>
        <Text style={styles.waitingIcon}>⏳</Text>
        <Text style={styles.waitingTitle}>Solicitud enviada</Text>
        <Text style={styles.waitingText}>
          Si ese correo tiene una cuenta con al menos 3 contactos de confianza, la solicitud quedó abierta. Necesitas que 3 la aprueben.
        </Text>
        <View style={styles.waitingSteps}>
          <Text style={styles.stepItem}>1️⃣ Contacta a tus contactos de confianza personalmente</Text>
          <Text style={styles.stepItem}>2️⃣ Pídeles que abran Cercanía y aprueben tu solicitud</Text>
          <Text style={styles.stepItem}>3️⃣ Espera 48 horas después de la última aprobación</Text>
          <Text style={styles.stepItem}>4️⃣ Recibirás un enlace para crear nueva contraseña</Text>
        </View>
        <Button title="Volver al inicio" variant="ghost" fullWidth onPress={() => router.replace('/(auth)/login')} style={{ marginTop: Spacing.md }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
        <Text style={styles.backText}>← Volver</Text>
      </Pressable>

      <Text style={styles.icon}>🔐</Text>
      <Text style={styles.title}>Recuperación social</Text>
      <Text style={styles.subtitle}>
        Si perdiste acceso a tu correo y contraseña, tus contactos de confianza pueden ayudarte.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ Necesitas al menos 3 contactos de confianza configurados previamente, y 48 horas de espera por seguridad.
        </Text>
      </View>

      <Text style={styles.label}>Tu correo registrado en Cercanía</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        placeholderTextColor={Colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Button
        title="Iniciar recuperación social"
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        onPress={startRecovery}
        style={{ marginTop: Spacing.xl }}
      />

      <Pressable style={styles.panicLink} onPress={showPanicHelp}>
        <Text style={styles.panicLinkText}>
          ¿Alguien está intentando recuperar tu cuenta sin tu permiso?
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  container: { flex: 1, backgroundColor: Colors.bg, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  back: { marginBottom: Spacing.lg },
  backText: { ...Typography.body, color: Colors.textSoft },
  icon: { fontSize: 64, textAlign: 'center', marginBottom: Spacing.sm },
  title: { ...Typography.h1, color: Colors.text },
  subtitle: { ...Typography.body, color: Colors.textSoft, marginTop: Spacing.xs, lineHeight: 22, marginBottom: Spacing.lg },
  infoBox: { backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '44' },
  infoText: { ...Typography.body, color: Colors.primaryDark, lineHeight: 22 },
  label: { ...Typography.bodyBold, color: Colors.text, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.lg, ...Typography.body, color: Colors.text },
  panicLink: { marginTop: Spacing.xl, alignItems: 'center' },
  panicLinkText: { ...Typography.body, color: Colors.danger, textAlign: 'center', textDecorationLine: 'underline' },
  waitingIcon: { fontSize: 72 },
  waitingTitle: { ...Typography.h1, color: Colors.text, textAlign: 'center' },
  waitingText: { ...Typography.body, color: Colors.textSoft, textAlign: 'center', lineHeight: 22 },
  waitingSteps: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md, width: '100%' },
  stepItem: { ...Typography.body, color: Colors.text, lineHeight: 22 }
});