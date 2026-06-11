// 📁 cercania/app-scaffold/src/components/auth/PasswordStrength.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../lib/theme';
import { scorePassword } from '../../utils/validation';

interface Props { password: string; }

export function PasswordStrength({ password }: Props) {
  const s = scorePassword(password);
  if (!password) return null;

  const segments = 4;
  const filled = Math.min(segments, s.score);
  const color = [Colors.danger, Colors.danger, Colors.warning, Colors.success, Colors.success][s.score];

  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {Array.from({ length: segments }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { backgroundColor: i < filled ? color : Colors.border }
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color }]}>{s.label}</Text>
      {s.hints.length > 0 && (
        <View style={styles.hints}>
          {s.hints.map((h, i) => (
            <Text key={i} style={styles.hint}>• {h}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: -Spacing.sm, marginBottom: Spacing.md },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: Radius.sm },
  label: { ...Typography.caption, fontWeight: '600', marginTop: Spacing.xs },
  hints: { marginTop: Spacing.xs },
  hint: { ...Typography.small, color: Colors.textSoft }
});
