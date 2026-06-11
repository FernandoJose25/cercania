// 📁 cercania/app-scaffold/src/components/ui/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../lib/theme';

const { width } = Dimensions.get('window');

export function AppSplashScreen() {
    const scale = useRef(new Animated.Value(0.3)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const rotate = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const dotsOpacity = useRef(new Animated.Value(0)).current;
    const ring1 = useRef(new Animated.Value(0.8)).current;
    const ring2 = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();

        Animated.loop(
            Animated.timing(rotate, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(ring1, { toValue: 1.3, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(ring1, { toValue: 0.8, duration: 1200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(ring2, { toValue: 1.5, duration: 1600, delay: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(ring2, { toValue: 0.6, duration: 1600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            ])
        ).start();

        setTimeout(() => Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start(), 400);
        setTimeout(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(dotsOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(dotsOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        }, 700);
    }, []);

    const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <View style={styles.container}>
            {/* Fondo azul degradado */}
            <View style={styles.bgTop} />
            <View style={styles.bgBottom} />

            {/* Círculos decorativos */}
            <View style={[styles.decoCircle, { width: 300, height: 300, top: -80, right: -80, backgroundColor: 'rgba(37,99,235,0.08)' }]} />
            <View style={[styles.decoCircle, { width: 200, height: 200, bottom: 80, left: -60, backgroundColor: 'rgba(163,230,53,0.1)' }]} />

            {/* Icono animado */}
            <Animated.View style={[styles.iconWrap, { opacity, transform: [{ scale }] }]}>
                {/* Rings pulsantes */}
                <Animated.View style={[styles.ring, { width: 140, height: 140, borderRadius: 70, borderColor: Colors.primaryLight, transform: [{ scale: ring1 }] }]} />
                <Animated.View style={[styles.ring, { width: 160, height: 160, borderRadius: 80, borderColor: 'rgba(37,99,235,0.1)', transform: [{ scale: ring2 }] }]} />

                {/* Círculo principal */}
                <View style={styles.iconCircle}>
                    <Text style={styles.iconEmoji}>📍</Text>
                </View>

                {/* Anillo giratorio */}
                <Animated.View style={[styles.spinRing, { transform: [{ rotate: spin }] }]} />
            </Animated.View>

            {/* Texto */}
            <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
                <Text style={styles.appName}>Cercanía</Text>
                <Text style={styles.tagline}>Mantente cerca de los tuyos</Text>
            </Animated.View>

            {/* Dots de carga */}
            <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
                {[0, 1, 2].map(i => <View key={i} style={[styles.dot, i === 1 && styles.dotMid]} />)}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
    bgTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%', backgroundColor: Colors.bgAlt, borderBottomLeftRadius: 60, borderBottomRightRadius: 60 },
    bgBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', backgroundColor: Colors.bg },
    decoCircle: { position: 'absolute', borderRadius: 999 },
    iconWrap: { alignItems: 'center', justifyContent: 'center', width: 160, height: 160, marginBottom: 40 },
    ring: { position: 'absolute', borderWidth: 2 },
    iconCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: Colors.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4, shadowRadius: 20, elevation: 12
    },
    iconEmoji: { fontSize: 46 },
    spinRing: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        borderWidth: 3, borderColor: Colors.primary,
        borderTopColor: 'transparent', borderLeftColor: 'transparent',
        opacity: 0.6
    },
    textBlock: { alignItems: 'center' },
    appName: { fontSize: 40, fontWeight: '900', color: Colors.text, letterSpacing: -1 },
    tagline: { fontSize: 15, color: Colors.textSoft, marginTop: 6, fontWeight: '500' },
    dotsRow: { flexDirection: 'row', gap: 6, position: 'absolute', bottom: 80 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary, opacity: 0.5 },
    dotMid: { width: 20, borderRadius: 4, backgroundColor: Colors.primary, opacity: 0.8 },
});