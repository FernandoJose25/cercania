// 📁 cercania/app-scaffold/app/(app)/group/join.tsx
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../../src/components/ui/Button';
import { Colors, Radius, Spacing, Typography } from '../../../src/lib/theme';
import { useGroups } from '../../../src/store/groups';

export default function JoinGroupScreen() {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const { joinGroup } = useGroups();

    const handleJoin = async () => {
        if (code.trim().length !== 6) { Alert.alert('El código debe tener 6 caracteres'); return; }
        setLoading(true);
        try {
            await joinGroup(code);
            Alert.alert('Te uniste al grupo', 'Ya puedes ver a los miembros en el mapa.',
                [{ text: 'Ver mapa', onPress: () => router.replace('/(app)/home') }]);
        } catch (e: any) {
            Alert.alert('No se pudo unir', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
                <Text style={styles.backText}>← Volver</Text>
            </Pressable>

            <Text style={styles.emoji}>🔗</Text>
            <Text style={styles.title}>Unirse a un grupo</Text>
            <Text style={styles.subtitle}>
                Ingresa el código de 6 caracteres que te compartió un familiar.
            </Text>

            <TextInput
                style={styles.codeInput}
                placeholder="ABC123"
                placeholderTextColor={Colors.textMuted}
                value={code}
                onChangeText={t => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                textAlign="center"
            />

            <Button
                title="Unirse al grupo"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={code.length !== 6}
                onPress={handleJoin}
                style={{ marginTop: Spacing.xl }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg, padding: Spacing.xl },
    back: { marginBottom: Spacing.md },
    backText: { ...Typography.body, color: Colors.textSoft },
    emoji: { fontSize: 64, textAlign: 'center', marginTop: Spacing.xl },
    title: { ...Typography.h1, color: Colors.text, textAlign: 'center', marginTop: Spacing.md },
    subtitle: { ...Typography.body, color: Colors.textSoft, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 22 },
    codeInput: {
        backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.primary,
        borderRadius: Radius.lg, padding: Spacing.xl,
        fontSize: 36, fontWeight: '700', color: Colors.text,
        letterSpacing: 12, textAlign: 'center'
    }
});