// 📁 cercania/app-scaffold/app/(app)/sos-active.tsx
/**
 * Pantalla de SOS activo.
 * Se muestra cuando el usuario ha activado una emergencia.
 *
 * Diseño de emergencia:
 * - Fondo rojo con pulso animado
 * - Ubicación en tiempo real
 * - Botón grande para cancelar
 * - Timer mostrando cuánto tiempo lleva activo
 * - Instrucciones claras para la persona en peligro
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    View,
    Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { cancelSOS } from '../../src/services/sos.service';
import { Spacing, Typography } from '../../src/lib/theme';

export default function SOSActiveScreen() {
    const { alertId, groupName } = useLocalSearchParams<{ alertId: string; groupName: string }>();
    const [elapsed, setElapsed] = useState(0);
    const [cancelling, setCancelling] = useState(false);
    const pulse = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<ReturnType<typeof setInterval>>();

    // Pulso de fondo
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.04, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();
    }, [pulse]);

    // Timer
    useEffect(() => {
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    const handleCancel = () => {
        Alert.alert(
            'Cancelar SOS',
            '¿Estás seguro? Tus familiares dejarán de recibir la alerta.',
            [
                { text: 'Mantener SOS', style: 'cancel' },
                {
                    text: 'Cancelar SOS',
                    style: 'destructive',
                    onPress: async () => {
                        if (!alertId) return;
                        setCancelling(true);
                        try {
                            await cancelSOS(alertId);
                            router.replace('/(app)/home');
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                            setCancelling(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: pulse }] }]}>
            {/* Icono */}
            <Text style={styles.icon}>🆘</Text>

            {/* Título */}
            <Text style={styles.title}>ALERTA SOS ACTIVA</Text>
            <Text style={styles.group}>Grupo: {groupName ?? 'Tu familia'}</Text>

            {/* Timer */}
            <View style={styles.timerBox}>
                <Text style={styles.timerLabel}>Tiempo activo</Text>
                <Text style={styles.timer}>{formatTime(elapsed)}</Text>
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    ✅ Tu familia ha sido notificada
                </Text>
                <Text style={styles.infoText}>
                    📍 Tu ubicación se está compartiendo
                </Text>
                <Text style={styles.infoText}>
                    📞 Llama al 911 si es una emergencia grave
                </Text>
            </View>

            {/* Botón cancelar */}
            <Pressable
                style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
                onPress={handleCancel}
                disabled={cancelling}
            >
                <Text style={styles.cancelText}>
                    {cancelling ? 'Cancelando...' : 'Estoy a salvo — Cancelar SOS'}
                </Text>
            </Pressable>

            <Text style={styles.hint}>
                Mantén esta pantalla abierta mientras necesites ayuda
            </Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#CC0000',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        gap: Spacing.lg
    },
    icon: { fontSize: 80 },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 2,
        textAlign: 'center'
    },
    group: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600'
    },
    timerBox: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        alignItems: 'center'
    },
    timerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
    timer: { color: '#fff', fontSize: 48, fontWeight: '800', letterSpacing: 4 },
    infoBox: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: Spacing.lg,
        gap: Spacing.sm,
        width: '100%'
    },
    infoText: { color: '#fff', fontSize: 15, fontWeight: '500' },
    cancelBtn: {
        backgroundColor: '#fff',
        borderRadius: 50,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        width: '100%',
        alignItems: 'center',
        marginTop: Spacing.md
    },
    cancelBtnDisabled: { opacity: 0.6 },
    cancelText: { color: '#CC0000', fontSize: 16, fontWeight: '800' },
    hint: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        textAlign: 'center',
        marginTop: Spacing.sm
    }
});