// 📁 cercania/app-scaffold/app/(app)/settings/invisible-mode.tsx
/**
 * Pantalla de Modo Invisible.
 * El usuario puede ocultar su ubicación temporalmente.
 * El grupo ve "Ubicación pausada" en lugar de su pin.
 */
import React, { useEffect, useState } from 'react';
import {
    Alert, Pressable, ScrollView, StyleSheet,
    Text, View, Switch
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../../src/lib/theme';
import { getSupabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/store/auth';
import { Button } from '../../../src/components/ui/Button';

const DURATION_OPTIONS = [
    { label: '30 minutos', hours: 0.5, emoji: '⏱️' },
    { label: '1 hora', hours: 1, emoji: '🕐' },
    { label: '3 horas', hours: 3, emoji: '🕒' },
    { label: '8 horas', hours: 8, emoji: '🌙' },
    { label: 'Hasta que lo desactive', hours: 999, emoji: '🔒' }
];

export default function InvisibleModeScreen() {
    const { user } = useAuth();
    const [isInvisible, setIsInvisible] = useState(false);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedHours, setSelectedHours] = useState(1);
    const [saving, setSaving] = useState(false);

    const loadStatus = async () => {
        setLoading(true);
        try {
            const sb = await getSupabase();
            const { data } = await sb
                .from('invisible_mode')
                .select('expires_at')
                .eq('user_id', user?.id)
                .single();

            if (data) {
                const expires = new Date(data.expires_at);
                if (expires > new Date()) {
                    setIsInvisible(true);
                    setExpiresAt(expires);
                } else {
                    // Expiró, limpiar
                    await sb.from('invisible_mode').delete().eq('user_id', user?.id);
                    setIsInvisible(false);
                    setExpiresAt(null);
                }
            } else {
                setIsInvisible(false);
                setExpiresAt(null);
            }
        } catch {
            setIsInvisible(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStatus(); }, []);

    const activate = async () => {
        setSaving(true);
        try {
            const sb = await getSupabase();
            await sb.rpc('set_invisible_mode', { p_hours: selectedHours });
            await loadStatus();
            Alert.alert(
                'Modo invisible activado',
                selectedHours === 999
                    ? 'Tu ubicación está oculta hasta que lo desactives.'
                    : `Tu ubicación estará oculta por ${DURATION_OPTIONS.find(o => o.hours === selectedHours)?.label}.`
            );
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const deactivate = async () => {
        setSaving(true);
        try {
            const sb = await getSupabase();
            await sb.rpc('disable_invisible_mode');
            setIsInvisible(false);
            setExpiresAt(null);
            Alert.alert('Visible', 'Tu familia puede verte de nuevo en el mapa.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const formatExpiry = (date: Date) => {
        const diff = date.getTime() - Date.now();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        if (hours > 0) return `${hours}h ${minutes}m restantes`;
        return `${minutes}m restantes`;
    };

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
                <Text style={styles.backText}>← Volver</Text>
            </Pressable>

            <Text style={styles.title}>Modo invisible</Text>
            <Text style={styles.subtitle}>
                Pausa tu ubicación temporalmente. Tu familia verá que pausaste la ubicación — sin mentiras, con privacidad.
            </Text>

            {/* Estado actual */}
            <View style={[styles.statusCard, isInvisible ? styles.statusInvisible : styles.statusVisible]}>
                <Text style={styles.statusEmoji}>{isInvisible ? '👁️‍🗨️' : '👁️'}</Text>
                <View style={styles.statusInfo}>
                    <Text style={styles.statusTitle}>
                        {isInvisible ? 'Invisible ahora' : 'Visible para tu familia'}
                    </Text>
                    <Text style={styles.statusSub}>
                        {isInvisible && expiresAt
                            ? expiresAt.getFullYear() > 2099
                                ? 'Hasta que lo desactives'
                                : formatExpiry(expiresAt)
                            : 'Tu familia puede ver tu ubicación'}
                    </Text>
                </View>
                {isInvisible && (
                    <Switch
                        value={true}
                        onValueChange={deactivate}
                        trackColor={{ true: Colors.danger }}
                        thumbColor="#fff"
                    />
                )}
            </View>

            {/* Activar modo invisible */}
            {!isInvisible && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>¿Por cuánto tiempo?</Text>
                    <View style={styles.options}>
                        {DURATION_OPTIONS.map(opt => (
                            <Pressable
                                key={opt.hours}
                                style={[styles.option, selectedHours === opt.hours && styles.optionSelected]}
                                onPress={() => setSelectedHours(opt.hours)}
                            >
                                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                                <Text style={[styles.optionLabel, selectedHours === opt.hours && styles.optionLabelSelected]}>
                                    {opt.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    <Button
                        title="Activar modo invisible"
                        variant="primary"
                        fullWidth
                        loading={saving}
                        onPress={activate}
                        style={{ marginTop: Spacing.lg }}
                    />
                </View>
            )}

            {/* Desactivar */}
            {isInvisible && (
                <Button
                    title="Volver a ser visible"
                    variant="secondary"
                    fullWidth
                    loading={saving}
                    onPress={deactivate}
                    style={{ marginTop: Spacing.lg }}
                />
            )}

            {/* Info */}
            <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>ℹ️ ¿Qué ven los demás?</Text>
                <Text style={styles.infoText}>
                    Cuando estás invisible, tu familia ve en el mapa:{'\n\n'}
                    <Text style={{ fontStyle: 'italic' }}>"{user?.user_metadata?.display_name?.split(' ')[0] ?? 'Tú'} pausó su ubicación"</Text>{'\n\n'}
                    No ven tu posición pero saben que pausaste voluntariamente. Esto es transparente y honesto.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
    back: { marginBottom: Spacing.md },
    backText: { ...Typography.body, color: Colors.textSoft },
    title: { ...Typography.h1, color: Colors.text },
    subtitle: { ...Typography.body, color: Colors.textSoft, marginTop: Spacing.xs, lineHeight: 22, marginBottom: Spacing.xl },
    statusCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.card },
    statusVisible: { backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary + '44' },
    statusInvisible: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: Colors.border },
    statusEmoji: { fontSize: 36 },
    statusInfo: { flex: 1 },
    statusTitle: { ...Typography.bodyBold, color: Colors.text },
    statusSub: { ...Typography.caption, color: Colors.textSoft, marginTop: 2 },
    section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadows.card },
    sectionTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.md },
    options: { gap: Spacing.sm },
    option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: 'transparent' },
    optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
    optionEmoji: { fontSize: 22 },
    optionLabel: { ...Typography.bodyBold, color: Colors.text },
    optionLabelSelected: { color: Colors.primaryDark },
    infoBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
    infoTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm },
    infoText: { ...Typography.body, color: Colors.textSoft, lineHeight: 22 }
});