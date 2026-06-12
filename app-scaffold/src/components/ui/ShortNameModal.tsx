// 📁 cercania/app-scaffold/src/components/ui/ShortNameModal.tsx
// Modal que aparece encima de la pantalla actual cuando el display_name es muy largo.
// No redirige — el usuario sigue donde estaba y el modal se cierra al guardar.
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
  Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../lib/theme';
import { getSupabase } from '../../lib/supabase';
import { useAuth } from '../../store/auth';

interface Props {
  visible: boolean;
  existingName: string;
}

export function ShortNameModal({ visible, existingName }: Props) {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert('Nombre muy corto', 'Ingresa al menos 2 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const sb = await getSupabase();
      const { error } = await sb
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', user!.id);
      if (error) throw error;
      await refreshProfile();
      // El modal se cierra solo cuando profile.display_name.length <= 20
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>👤</Text>
          </View>

          <Text style={styles.title}>Elige un nombre corto</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.longName}>"{existingName}"</Text>
            {'\n'}es muy largo para el mapa (máx. 20 caracteres).
          </Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={t => setName(t.slice(0, 20))}
            placeholder="Ej: Mamá, Fernando, Sofia..."
            placeholderTextColor={Colors.textMuted}
            maxLength={20}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <Text style={[styles.counter, name.length >= 18 && { color: Colors.danger }]}>
            {name.length}/20
          </Text>

          <Pressable
            style={[styles.btn, (!name.trim() || name.trim().length < 2 || saving) && styles.btnDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || name.trim().length < 2 || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>Guardar y continuar</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.floating,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.glow,
  },
  icon: { fontSize: 32 },
  title: { ...Typography.h2, color: Colors.text, textAlign: 'center' },
  subtitle: {
    ...Typography.body, color: Colors.textSoft,
    textAlign: 'center', lineHeight: 22,
  },
  longName: { color: Colors.danger, fontWeight: '700' },
  input: {
    width: '100%',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text,
    textAlign: 'center',
    fontSize: 18,
  },
  counter: {
    ...Typography.caption,
    color: Colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
  },
  btn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.button,
  },
  btnDisabled: { backgroundColor: Colors.border },
  btnText: { ...Typography.bodyBold, color: '#fff', fontSize: 16 },
});
