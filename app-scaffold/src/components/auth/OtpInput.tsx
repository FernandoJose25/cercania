// 📁 cercania/app-scaffold/src/components/auth/OtpInput.tsx
import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, TextInput, View, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../lib/theme';

interface Props {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  error?: boolean;
}

export function OtpInput({
  length = 8,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  error
}: Props) {
  const inputs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const digits = value.split('').slice(0, length);
  while (digits.length < length) digits.push('');

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputs.current[0]?.focus(), 100);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
  }, [value, length, onComplete]);

  const handleChange = (text: string, idx: number) => {
    // Soporta pegar el código completo
    if (text.length > 1) {
      const cleaned = text.replace(/\D/g, '').slice(0, length);
      onChange(cleaned);
      const next = Math.min(cleaned.length, length - 1);
      inputs.current[next]?.focus();
      return;
    }

    const ch = text.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[idx] = ch;
    onChange(newDigits.join('').slice(0, length));

    if (ch && idx < length - 1) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, idx) => (
        <TextInput
          key={idx}
          ref={el => { inputs.current[idx] = el; }}
          value={digits[idx]}
          onChangeText={t => handleChange(t, idx)}
          onKeyPress={e => handleKeyPress(e, idx)}
          onFocus={() => setFocusedIndex(idx)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={1}
          selectTextOnFocus
          style={[
            styles.box,
            focusedIndex === idx && styles.boxFocused,
            error && styles.boxError,
            !!digits[idx] && styles.boxFilled
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  box: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 56,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    textAlign: 'center',
    ...Typography.h1,
    color: Colors.text
  },
  boxFocused: { borderColor: Colors.primary },
  boxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  boxError: { borderColor: Colors.danger }
});
