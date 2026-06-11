// 📁 cercania/app-scaffold/src/components/sos/SOSButton.tsx
/**
 * Botón SOS de alta seguridad.
 *
 * UX de emergencia real (igual que Life360 y bSafe):
 * - Mantener presionado 3 segundos para activar
 * - Barra de progreso visual durante el hold
 * - Vibración progresiva como feedback
 * - Imposible activar con un toque accidental
 * - Se puede cancelar soltando antes de los 3s
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Shadows } from '../../lib/theme';

const HOLD_DURATION_MS = 3000;

interface Props {
    onActivate: () => void;
    disabled?: boolean;
    size?: 'sm' | 'lg';
}

export function SOSButton({ onActivate, disabled, size = 'lg' }: Props) {
    const [holding, setHolding] = useState(false);
    const progress = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hapticTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const animRef = useRef<Animated.CompositeAnimation | null>(null);

    const buttonSize = size === 'lg' ? 100 : 72;
    const fontSize = size === 'lg' ? 18 : 14;

    // Animación de pulso en reposo
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulse]);

    const startHold = useCallback(() => {
        if (disabled) return;
        setHolding(true);
        progress.setValue(0);

        // Animación de progreso
        animRef.current = Animated.timing(progress, {
            toValue: 1,
            duration: HOLD_DURATION_MS,
            easing: Easing.linear,
            useNativeDriver: false
        });
        animRef.current.start(({ finished }) => {
            if (finished) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                onActivate();
            }
        });

        // Vibración progresiva cada 600ms
        let count = 0;
        hapticTimer.current = setInterval(async () => {
            count++;
            if (count <= 4) {
                await Haptics.impactAsync(
                    count < 3
                        ? Haptics.ImpactFeedbackStyle.Light
                        : Haptics.ImpactFeedbackStyle.Heavy
                );
            }
        }, 600);
    }, [disabled, onActivate, progress]);

    const stopHold = useCallback(() => {
        setHolding(false);
        animRef.current?.stop();
        if (hapticTimer.current) clearInterval(hapticTimer.current);
        if (holdTimer.current) clearTimeout(holdTimer.current);

        Animated.timing(progress, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false
        }).start();
    }, [progress]);

    const progressColor = progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['#FF6B6B', '#FF4444', '#CC0000']
    });

    const strokeDashoffset = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [283, 0] // circumference de r=45
    });

    return (
        <Pressable
            onPressIn={startHold}
            onPressOut={stopHold}
            disabled={disabled}
            style={({ pressed }) => [
                styles.wrapper,
                { width: buttonSize, height: buttonSize }
            ]}
        >
            <Animated.View style={[
                styles.outerRing,
                {
                    width: buttonSize + 20,
                    height: buttonSize + 20,
                    borderRadius: (buttonSize + 20) / 2,
                    transform: [{ scale: holding ? 1 : pulse }],
                    opacity: holding ? 0.8 : 0.4
                }
            ]} />

            <View style={[
                styles.button,
                { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
                holding && styles.buttonHolding,
                disabled && styles.buttonDisabled
            ]}>
                <Text style={[styles.label, { fontSize }]}>SOS</Text>
                {holding && (
                    <Text style={styles.holdLabel}>
                        Suelta para{'\n'}cancelar
                    </Text>
                )}
            </View>

            {/* Barra de progreso circular */}
            {holding && (
                <Animated.View
                    style={[
                        styles.progressRing,
                        {
                            width: buttonSize + 8,
                            height: buttonSize + 8,
                            borderRadius: (buttonSize + 8) / 2,
                            borderColor: progressColor
                        }
                    ]}
                />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrapper: { alignItems: 'center', justifyContent: 'center' },
    outerRing: {
        position: 'absolute',
        backgroundColor: Colors.danger
    },
    button: {
        backgroundColor: Colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
        ...Shadows.floating
    },
    buttonHolding: {
        backgroundColor: '#CC0000',
        borderColor: 'rgba(255,255,255,0.6)'
    },
    buttonDisabled: {
        backgroundColor: Colors.textMuted,
        opacity: 0.5
    },
    label: {
        color: '#fff',
        fontWeight: '900',
        letterSpacing: 2
    },
    holdLabel: {
        position: 'absolute',
        color: 'rgba(255,255,255,0.7)',
        fontSize: 9,
        textAlign: 'center',
        bottom: 10
    },
    progressRing: {
        position: 'absolute',
        borderWidth: 4,
        borderColor: Colors.danger
    }
});