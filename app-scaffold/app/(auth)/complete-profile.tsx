import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../src/lib/theme';
import { Button } from '../../src/components/ui/Button';
import { useAuth } from '../../src/store/auth';
import { getSupabase } from '../../src/lib/supabase';

export default function CompleteProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const existingName = profile?.display_name ?? '';
  const isTooLong = existingName.length > 20;
  const [name, setName] = useState(isTooLong ? existingName : '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      Alert.alert('Nombre requerido', 'Ingresa tu nombre para continuar (mínimo 2 caracteres).');
      return;
    }
    setSaving(true);
    try {
      const sb = await getSupabase();
      const { error } = await sb.from('profiles').update({
        display_name: trimmed,
        phone: phone.trim() || null,
      }).eq('id', user!.id);
      if (error) throw error;
      await refreshProfile();
      router.replace('/(app)/home');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topDecor} />

        <View style={styles.iconBox}>
          <Text style={styles.icon}>👤</Text>
        </View>

        <Text style={styles.title}>
          {isTooLong ? 'Elige un nombre corto' : 'Completa tu perfil'}
        </Text>
        <Text style={styles.subtitle}>
          {isTooLong
            ? `"${existingName}" es muy largo para mostrarse en el mapa. Elige un nombre corto (máx. 20 caracteres).`
            : 'Para que tu familia pueda reconocerte en el mapa, necesitamos tu nombre.'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nombre visible * (máx. 20 caracteres)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={t => setName(t.slice(0, 20))}
            placeholder="Ej: Mamá, Fernando, Sofia..."
            placeholderTextColor={Colors.textMuted}
            maxLength={20}
            autoFocus
            returnKeyType="next"
          />
          <Text style={[styles.hint, name.length >= 18 && { color: Colors.danger }]}>
            {name.length}/20 · Aparecerá en el mapa y en el ícono de perfil.
          </Text>

          <Text style={[styles.label, { marginTop: Spacing.lg }]}>Teléfono (opcional)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+51 999 999 999"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            maxLength={20}
          />
        </View>

        <Button
          title="Guardar y continuar"
          variant="primary"
          fullWidth
          loading={saving}
          onPress={handleSave}
          style={styles.btn}
        />

        <Pressable onPress={() => router.replace('/(app)/home')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Omitir por ahora</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: 48 },
  topDecor: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200,
    backgroundColor: Colors.bgAlt,
    borderBottomLeftRadius: 48, borderBottomRightRadius: 48,
  },
  iconBox: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginTop: 80,
    ...Shadows.glow,
  },
  icon: { fontSize: 40 },
  title: { ...Typography.h1, color: Colors.text, textAlign: 'center', marginTop: Spacing.xl, marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, color: Colors.textSoft, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.card,
    marginBottom: Spacing.lg,
  },
  label: { ...Typography.bodyBold, color: Colors.text, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text,
  },
  hint: { ...Typography.caption, color: Colors.textMuted, marginTop: 6 },
  btn: { marginBottom: Spacing.md },
  skipBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  skipText: { ...Typography.caption, color: Colors.textMuted, textDecorationLine: 'underline' },
});
