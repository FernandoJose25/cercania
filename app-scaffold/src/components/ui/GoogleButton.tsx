// 📁 cercania/app-scaffold/src/components/ui/GoogleButton.tsx
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../lib/theme';

interface Props {
    onPress: () => void;
    loading?: boolean;
    label?: string;
}

export function GoogleButton({ onPress, loading, label = 'Continuar con Google' }: Props) {
    return (
        <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={onPress}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator size="small" color="#4285F4" />
            ) : (
                <>
                    <View style={styles.logoBox}>
                        {/* Logo G con los colores oficiales de Google */}
                        <Text style={styles.logoG}>
                            <Text style={{ color: '#4285F4' }}>G</Text>
                        </Text>
                    </View>
                    <Text style={styles.label}>{label}</Text>
                </>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: Radius.pill,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingVertical: 14,
        paddingHorizontal: Spacing.xl,
        gap: Spacing.md,
        height: 54,
        ...Shadows.card,
    },
    btnPressed: { backgroundColor: '#F8FAFC', transform: [{ scale: 0.98 }] },
    logoBox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    logoG: { fontSize: 20, fontWeight: '800' },
    label: { fontSize: 15, fontWeight: '700', color: '#1C1917', letterSpacing: 0.1 },
});