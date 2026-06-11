// 📁 cercania/app-scaffold/src/components/ui/Input.tsx
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../lib/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  hint,
  isPassword,
  ...rest
}: InputProps) {
  const [hidden, setHidden] = useState(!!isPassword);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError
        ]}
      >
        <TextInput
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
          secureTextEntry={isPassword ? hidden : false}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          style={[styles.input, rest.style]}
        />

        {isPassword && (
          <Pressable hitSlop={10} onPress={() => setHidden(h => !h)}>
            <Text style={styles.toggle}>{hidden ? 'Mostrar' : 'Ocultar'}</Text>
          </Pressable>
        )}
      </View>

      {error
        ? <Text style={styles.error}>{error}</Text>
        : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  label: { ...Typography.bodyBold, color: Colors.text, marginBottom: Spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    minHeight: 52
  },
  fieldFocused: { borderColor: Colors.primary },
  fieldError: { borderColor: Colors.danger },
  input: { flex: 1, ...Typography.body, color: Colors.text, paddingVertical: Spacing.md },
  toggle: { ...Typography.caption, fontWeight: '600', color: Colors.primaryDark, marginLeft: Spacing.sm },
  error: { ...Typography.caption, color: Colors.danger, marginTop: Spacing.xs },
  hint: { ...Typography.caption, color: Colors.textMuted, marginTop: Spacing.xs }
});
