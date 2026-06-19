import React, { useState, useEffect } from 'react';
import {
    Alert, Image, Modal, Pressable, ScrollView, StyleSheet,
    Text, TextInput, View
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radius, Spacing, Typography, Shadows } from '../../src/lib/theme';
import { useAuth } from '../../src/store/auth';
import { getSupabase } from '../../src/lib/supabase';
import { getInitials } from '../../src/utils/format';

// ─── Fila de menú ───────────────────────────────────────────────────────────
function MenuRow({
    ionIcon, label, sub, badge, accent = false, danger = false, isActive, onPress,
}: {
    ionIcon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; badge?: string;
    accent?: boolean; danger?: boolean; isActive?: boolean; onPress?: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [rowS.wrap, pressed && { opacity: 0.65 }]}
            onPress={onPress}
        >
            <View style={[rowS.iconBox, {
                backgroundColor: danger ? '#EF444422' : accent ? '#F59E0B22' : '#29252422',
            }]}>
                <Ionicons
                    name={ionIcon}
                    size={20}
                    color={danger ? '#EF4444' : accent ? '#F59E0B' : '#A8A29E'}
                />
            </View>
            <View style={rowS.body}>
                <Text style={[rowS.label, danger && { color: '#EF4444' }]}>{label}</Text>
                {sub && <Text style={rowS.sub} numberOfLines={1}>{sub}</Text>}
            </View>
            {badge && (
                <View style={rowS.badge}>
                    <Text style={rowS.badgeText}>{badge}</Text>
                </View>
            )}
            {isActive !== undefined && (
                <View style={[rowS.activePill, isActive ? rowS.activePillOn : rowS.activePillOff]}>
                    <Text style={[rowS.activePillText, { color: isActive ? '#fff' : '#78716C' }]}>
                        {isActive ? 'ON' : 'OFF'}
                    </Text>
                </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={danger ? '#EF444466' : '#57534E'} />
        </Pressable>
    );
}
const rowS = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13 },
    iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1 },
    label: { fontSize: 15, fontWeight: '600', color: '#FAFAF9' },
    sub: { fontSize: 12, color: '#78716C', marginTop: 1 },
    badge: { backgroundColor: '#EF4444', borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
    activePill: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
    activePillOn: { backgroundColor: '#10B981' },
    activePillOff: { backgroundColor: '#292524' },
    activePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});

// ─── Pantalla principal ──────────────────────────────────────────────────────
export default function ProfileScreen() {
    const { profile, user, refreshProfile, signOut } = useAuth();
    const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
    const [phone, setPhone] = useState(profile?.phone ?? '');
    const [backupEmail, setBackupEmail] = useState(profile?.backup_email ?? '');
    const [backupPhone, setBackupPhone] = useState(profile?.backup_phone ?? '');
    const [saving, setSaving] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteOtp, setDeleteOtp] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [editVisible, setEditVisible] = useState(false);
    const [isInvisible, setIsInvisible] = useState(false);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        setDisplayName(profile?.display_name ?? '');
        setPhone(profile?.phone ?? '');
        setBackupEmail(profile?.backup_email ?? '');
        setBackupPhone(profile?.backup_phone ?? '');
    }, [profile]);

    useEffect(() => {
        const loadPrivacySettings = async () => {
            if (!user?.id) return;
            try {
                const sb = await getSupabase();
                const [{ data: invData }, { data: settData }] = await Promise.all([
                    sb.from('invisible_mode').select('id').eq('user_id', user.id).limit(1),
                    sb.from('user_settings').select('biometric_enabled').eq('user_id', user.id).single(),
                ]);
                setIsInvisible((invData?.length ?? 0) > 0);
                setIsBiometricEnabled(settData?.biometric_enabled ?? false);
            } catch { }
        };
        loadPrivacySettings();
    }, [user?.id]);

    const handlePickAvatar = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images' as any,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            if (result.canceled || !result.assets?.[0]) return;
            setUploadingAvatar(true);
            const manipulated = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: 400, height: 400 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            const sb = await getSupabase();
            const path = `${user!.id}/avatar.jpg`;
            const response = await fetch(manipulated.uri);
            const blob = await response.blob();
            const { error: uploadError } = await sb.storage.from('avatars').upload(path, blob, {
                contentType: 'image/jpeg',
                upsert: true,
            });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path);
            const avatarUrl = `${publicUrl}?t=${Date.now()}`;
            await sb.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user!.id);
            await refreshProfile();
        } catch (e: any) {
            Alert.alert('Error al subir foto', e.message);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSave = async () => {
        if (!displayName.trim()) { Alert.alert('El nombre no puede estar vacío'); return; }
        setSaving(true);
        try {
            const sb = await getSupabase();
            const { error } = await sb.from('profiles').update({
                display_name: displayName.trim(),
                phone: phone.trim() || null,
                backup_email: backupEmail.trim() || null,
                backup_phone: backupPhone.trim() || null,
            }).eq('id', user?.id);
            if (error) throw error;
            await refreshProfile();
            setEditVisible(false);
            Alert.alert('Cambios guardados ✅');
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setSaving(false); }
    };

    const handleDeleteAccount = () => {
        Alert.alert('⚠️ Eliminar cuenta', 'Esta acción es PERMANENTE.\n\nSe borrarán todos tus datos, grupos e historial.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Continuar →', style: 'destructive',
                onPress: () => Alert.alert('🚨 Última confirmación', `¿Eliminar la cuenta "${profile?.display_name}"?`, [
                    { text: 'No', style: 'cancel' },
                    { text: 'Sí, eliminar', style: 'destructive', onPress: () => setDeleteModalVisible(true) }
                ])
            }
        ]);
    };

    const confirmDeletion = async () => {
        if (deleteOtp.trim().toLowerCase() !== user?.email?.toLowerCase()) {
            Alert.alert('Correo incorrecto', 'Escribe exactamente tu correo para confirmar.');
            return;
        }
        setDeleteLoading(true);
        try {
            const sb = await getSupabase();
            const { error } = await sb.rpc('delete_own_account');
            if (error) throw error;
            setDeleteModalVisible(false);
            await sb.auth.signOut();
        } catch (e: any) { Alert.alert('Error', e.message); setDeleteOtp(''); }
        finally { setDeleteLoading(false); }
    };

    const initials = getInitials(displayName);
    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'long' })
        : '';

    return (
        <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── HEADER ── */}
                <View style={styles.header}>
                    <View style={styles.headerBg} />
                    <View style={styles.headerCircle} />

                    <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={22} color="#fff" />
                    </Pressable>

                    {/* Avatar centrado */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarRing}>
                            {profile?.avatar_url
                                ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                                : (
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText} adjustsFontSizeToFit numberOfLines={1}>
                                            {initials || '?'}
                                        </Text>
                                    </View>
                                )
                            }
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedIcon}>✓</Text>
                            </View>
                            <Pressable
                                style={styles.cameraBtn}
                                onPress={handlePickAvatar}
                                disabled={uploadingAvatar}
                                hitSlop={6}
                            >
                                <Ionicons name="camera" size={16} color="#0C0A09" />
                            </Pressable>
                        </View>
                        <Text style={styles.avatarName} numberOfLines={1}>{displayName || 'Sin nombre'}</Text>
                        <Text style={styles.avatarEmail} numberOfLines={1}>{user?.email}</Text>
                        {memberSince && (
                            <View style={styles.sinceChip}>
                                <Text style={styles.sinceText}>📅 Miembro desde {memberSince}</Text>
                            </View>
                        )}
                        <Pressable style={styles.editBtn} onPress={() => setEditVisible(true)}>
                            <Ionicons name="pencil-outline" size={14} color="#fff" />
                            <Text style={styles.editBtnText}>Editar perfil</Text>
                        </Pressable>
                    </View>
                </View>

                {/* ── PRIVACIDAD Y SEGURIDAD ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PRIVACIDAD Y SEGURIDAD</Text>
                    <MenuRow ionIcon="eye-off-outline" label="Modo invisible" sub="Pausa tu ubicación temporalmente"
                        isActive={isInvisible}
                        onPress={() => router.push('/(app)/settings/invisible-mode')} />
                    <MenuRow ionIcon="finger-print-outline" label="Biometría" sub="Huella / Face ID al abrir la app"
                        accent isActive={isBiometricEnabled} onPress={() => router.push('/(app)/settings/biometric')} />
                    <MenuRow ionIcon="shield-checkmark-outline" label="Contactos de confianza" sub="Para recuperación de cuenta"
                        onPress={() => router.push('/(app)/settings/trusted-contacts')} />
                    <MenuRow ionIcon="share-outline" label="Compartir ubicación" sub="Link temporal para invitados"
                        onPress={() => router.push('/(app)/settings/share-location')} />
                </View>

                {/* ── FUNCIONES AVANZADAS ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>FUNCIONES AVANZADAS</Text>
                    <MenuRow ionIcon="time-outline" label="Historial de recorridos" sub="Dónde estuviste hoy"
                        onPress={() => router.push('/(app)/history')} />
                    <MenuRow ionIcon="airplane-outline" label="Modo viaje" sub="Tracking intensivo fuera de casa"
                        onPress={() => router.push('/(app)/settings/travel-mode')} />
                </View>

                {/* ── RECUPERACIÓN DE CUENTA ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>RECUPERACIÓN DE CUENTA</Text>
                    <MenuRow ionIcon="mail-outline" label="Correo de respaldo"
                        sub={backupEmail || 'Sin configurar — toca para agregar'}
                        badge={!backupEmail ? '!' : undefined}
                        onPress={() => setEditVisible(true)} />
                    <MenuRow ionIcon="phone-portrait-outline" label="Teléfono de respaldo"
                        sub={backupPhone || 'Sin configurar — toca para agregar'}
                        onPress={() => setEditVisible(true)} />
                </View>

                {/* ── SESIÓN ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SESIÓN</Text>
                    <MenuRow ionIcon="log-out-outline" label="Cerrar sesión" sub="Salir de esta cuenta"
                        onPress={signOut} />
                    <MenuRow ionIcon="trash-outline" label="Eliminar cuenta" sub="Acción permanente e irreversible"
                        danger onPress={handleDeleteAccount} />
                </View>

                {/* Versión */}
                <Text style={styles.version}>Cercanía · v0.1.9</Text>
                <View style={{ height: 32 }} />
            </ScrollView>

            {/* ── MODAL EDITAR PERFIL ── */}
            <Modal visible={editVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Editar perfil</Text>

                        <Text style={styles.inputLabel}>Nombre visible *</Text>
                        <TextInput
                            style={styles.input} value={displayName}
                            onChangeText={setDisplayName} maxLength={50}
                            placeholder="Tu nombre en el mapa"
                            placeholderTextColor={Colors.textMuted}
                        />
                        <Text style={styles.inputHint}>Máximo 20 caracteres para que se vea bien en el mapa</Text>

                        <Text style={styles.inputLabel}>Teléfono</Text>
                        <TextInput
                            style={styles.input} value={phone}
                            onChangeText={setPhone} keyboardType="phone-pad"
                            placeholder="+51 999 999 999"
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Text style={styles.inputLabel}>Correo de respaldo</Text>
                        <TextInput
                            style={styles.input} value={backupEmail}
                            onChangeText={setBackupEmail} keyboardType="email-address" autoCapitalize="none"
                            placeholder="correo_alternativo@email.com"
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Text style={styles.inputLabel}>Teléfono de respaldo</Text>
                        <TextInput
                            style={styles.input} value={backupPhone}
                            onChangeText={setBackupPhone} keyboardType="phone-pad"
                            placeholder="+51 999 999 999"
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Button title="Guardar cambios" variant="primary" fullWidth loading={saving}
                            onPress={handleSave} style={{ marginTop: Spacing.lg }} />
                        <Button title="Cancelar" variant="ghost" fullWidth
                            onPress={() => setEditVisible(false)} style={{ marginTop: Spacing.sm }} />
                    </View>
                </View>
            </Modal>

            {/* ── MODAL ELIMINAR CUENTA ── */}
            <Modal visible={deleteModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <View style={styles.dangerIconBox}>
                            <Text style={{ fontSize: 36 }}>🗑️</Text>
                        </View>
                        <Text style={[styles.modalTitle, { color: Colors.danger }]}>Confirmar eliminación</Text>
                        <Text style={styles.modalSub}>Escribe tu correo exactamente para confirmar la eliminación permanente:</Text>
                        <Text style={styles.modalEmail}>{user?.email}</Text>
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>⚠️ Esta acción eliminará tu cuenta, grupos, historial y todos tus datos. No se puede deshacer.</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { borderColor: Colors.danger, marginTop: Spacing.md }]}
                            value={deleteOtp} onChangeText={setDeleteOtp}
                            placeholder="Escribe tu correo aquí"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="email-address" autoCapitalize="none" autoFocus
                        />
                        <Button title="Eliminar definitivamente" variant="danger" fullWidth
                            loading={deleteLoading} onPress={confirmDeletion} style={{ marginTop: Spacing.lg }} />
                        <Button title="Cancelar" variant="ghost" fullWidth
                            onPress={() => { setDeleteModalVisible(false); setDeleteOtp(''); }}
                            style={{ marginTop: Spacing.sm }} />
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: Colors.bg },
    content: { paddingBottom: 40 },

    // ── HEADER ──
    header: {
        paddingHorizontal: Spacing.xl,
        paddingTop: 52,
        paddingBottom: Spacing.xxl,
        position: 'relative', overflow: 'hidden',
    },
    headerBg: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#1C1917',
        borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    },
    headerCircle: {
        position: 'absolute', width: 260, height: 260, borderRadius: 130,
        backgroundColor: Colors.primary, opacity: 0.08,
        top: -80, right: -60,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.xxl,
    },
    backIcon: { fontSize: 18, color: '#fff', fontWeight: '700' },

    avatarSection: { alignItems: 'center' },
    avatarRing: { position: 'relative', marginBottom: Spacing.md },
    avatar: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: Colors.primary,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)',
        ...Shadows.glow,
    },
    avatarImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)' },
    avatarText: { fontSize: 38, fontWeight: '900', color: '#fff' },
    verifiedBadge: {
        position: 'absolute', bottom: 0, right: 0,
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: Colors.accent,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: '#1C1917',
    },
    verifiedIcon: { fontSize: 13, color: '#fff', fontWeight: '900' },
    cameraBtn: {
        position: 'absolute', bottom: 0, left: 0,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#F59E0B',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#1C1917',
    },
    avatarName: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.3, maxWidth: '80%' },
    avatarEmail: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4, marginBottom: Spacing.md, maxWidth: '85%' },
    sinceChip: {
        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.pill,
        paddingHorizontal: 14, paddingVertical: 5, marginBottom: Spacing.md,
    },
    sinceText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    editBtn: {
        backgroundColor: Colors.primary, borderRadius: Radius.pill,
        paddingHorizontal: 24, paddingVertical: 10,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        ...Shadows.button,
    },
    editBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

    // ── SECCIONES ──
    section: {
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.xl, borderRadius: Radius.xl,
        padding: Spacing.lg, marginTop: Spacing.md,
        ...Shadows.card,
    },
    sectionTitle: {
        fontSize: 11, fontWeight: '800', letterSpacing: 1,
        color: Colors.textMuted, marginBottom: Spacing.sm,
    },

    version: {
        textAlign: 'center', fontSize: 12,
        color: Colors.textMuted, marginTop: Spacing.xl,
    },

    // ── MODALES ──
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: '#1C1917',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: Spacing.xl, paddingBottom: 40,
    },
    modalHandle: {
        width: 40, height: 4, backgroundColor: '#3C3936',
        borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
    },
    dangerIconBox: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.dangerLight,
        alignItems: 'center', justifyContent: 'center',
        alignSelf: 'center', marginBottom: Spacing.md,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#FAFAF9', textAlign: 'center', marginBottom: Spacing.sm },
    modalSub: { fontSize: 14, color: '#78716C', textAlign: 'center', marginBottom: Spacing.sm },
    modalEmail: { fontSize: 15, fontWeight: '700', color: '#FAFAF9', textAlign: 'center' },
    warningBox: {
        backgroundColor: '#EF444422', borderRadius: Radius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: '#EF444444', marginTop: Spacing.md,
    },
    warningText: { fontSize: 13, color: '#FCA5A5', textAlign: 'center', lineHeight: 18 },
    inputLabel: { fontSize: 12, fontWeight: '700', color: '#78716C', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: Spacing.xs },
    inputHint: { fontSize: 11, color: '#57534E', marginTop: 4 },
    input: {
        backgroundColor: '#292524', borderWidth: 1.5, borderColor: '#3C3936',
        borderRadius: Radius.lg, padding: Spacing.md,
        fontSize: 15, color: '#FAFAF9',
    },
});
