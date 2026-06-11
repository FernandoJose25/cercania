// 📁 cercania/app-scaffold/app/(app)/profile.tsx
import React, { useState, useEffect } from 'react';
import {
    Alert, Modal, Pressable, ScrollView, StyleSheet,
    Text, TextInput, View
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radius, Spacing, Typography, Shadows } from '../../src/lib/theme';
import { useAuth } from '../../src/store/auth';
import { getSupabase } from '../../src/lib/supabase';
import { getInitials } from '../../src/utils/format';

function MenuItem({ icon, label, sub, color, onPress }: { icon: string; label: string; sub?: string; color: string; onPress?: () => void }) {
    return (
        <Pressable style={miStyles.row} onPress={onPress}>
            <View style={[miStyles.iconBox, { backgroundColor: color + '22' }]}>
                <Text style={miStyles.icon}>{icon}</Text>
            </View>
            <View style={miStyles.info}>
                <Text style={miStyles.label}>{label}</Text>
                {sub && <Text style={miStyles.sub}>{sub}</Text>}
            </View>
            <Text style={miStyles.arrow}>›</Text>
        </Pressable>
    );
}
const miStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
    iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    icon: { fontSize: 20 },
    info: { flex: 1 },
    label: { ...Typography.bodyBold, color: Colors.text },
    sub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
    arrow: { fontSize: 22, color: Colors.textMuted },
});

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

    useEffect(() => {
        setDisplayName(profile?.display_name ?? '');
        setPhone(profile?.phone ?? '');
        setBackupEmail(profile?.backup_email ?? '');
        setBackupPhone(profile?.backup_phone ?? '');
    }, [profile]);

    const handleSaveProfile = async () => {
        if (!displayName.trim()) { Alert.alert('El nombre no puede estar vacío'); return; }
        setSaving(true);
        try {
            const sb = await getSupabase();
            const { error } = await sb.from('profiles').update({
                display_name: displayName.trim(),
                phone: phone.trim() || null,
                backup_email: backupEmail.trim() || null,
                backup_phone: backupPhone.trim() || null
            }).eq('id', user?.id);
            if (error) throw error;
            await refreshProfile();
            setEditVisible(false);
            Alert.alert('Perfil actualizado ✅');
        } catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
    };

    const handleDeleteAccount = () => {
        Alert.alert('⚠️ Eliminar cuenta', 'Esta acción es PERMANENTE e irreversible.\n\nSe eliminarán todos tus datos, grupos e historial.\n\n¿Estás seguro?', [
            { text: 'No, cancelar', style: 'cancel' },
            { text: 'Continuar →', style: 'destructive', onPress: () =>
                Alert.alert('🚨 Última advertencia', `¿Realmente deseas eliminar tu cuenta "${profile?.display_name ?? user?.email}"?`, [
                    { text: 'No, mantener mi cuenta', style: 'cancel' },
                    { text: 'Sí, eliminar definitivamente', style: 'destructive', onPress: () => setDeleteModalVisible(true) }
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
            const { error: delError } = await sb.rpc('delete_own_account');
            if (delError) throw delError;
            setDeleteModalVisible(false);
            await sb.auth.signOut();
        } catch (e: any) {
            Alert.alert('Error', e.message);
            setDeleteOtp('');
        } finally { setDeleteLoading(false); }
    };

    const initials = getInitials(displayName);
    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'long' })
        : '';

    return (
        <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerBg} />
                    <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
                        <Text style={styles.backIcon}>←</Text>
                    </Pressable>
                    <Text style={styles.headerTitle}>Mi perfil</Text>
                </View>

                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarRing}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials || '?'}</Text>
                        </View>
                        <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedIcon}>✓</Text>
                        </View>
                    </View>
                    <Text style={styles.avatarName}>{displayName || 'Sin nombre'}</Text>
                    <Text style={styles.avatarEmail}>{user?.email}</Text>
                    {memberSince && (
                        <View style={styles.memberBadge}>
                            <Text style={styles.memberText}>📅 Desde {memberSince}</Text>
                        </View>
                    )}
                    <Pressable style={styles.editBtn} onPress={() => setEditVisible(true)}>
                        <Text style={styles.editBtnText}>✏️ Editar perfil</Text>
                    </Pressable>
                </View>

                {/* Privacidad y seguridad */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PRIVACIDAD Y SEGURIDAD</Text>
                    <MenuItem icon="👁️‍🗨️" label="Modo invisible" sub="Pausa tu ubicación temporalmente" color={Colors.primary}
                        onPress={() => router.push('/(app)/settings/invisible-mode')} />
                    <MenuItem icon="🛡️" label="Contactos de confianza" sub="Para recuperación de cuenta" color="#8B5CF6"
                        onPress={() => router.push('/(app)/settings/trusted-contacts')} />
                    <MenuItem icon="🔐" label="Biometría" sub="Huella / Face ID al abrir la app" color={Colors.accent}
                        onPress={() => router.push('/(app)/settings/biometric')} />
                    <MenuItem icon="📍" label="Zonas seguras" sub="Gestiona tus geofences" color="#06B6D4"
                        onPress={() => router.push('/(app)/settings/geofences')} />
                </View>

                {/* Recuperación */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>RECUPERACIÓN DE CUENTA</Text>
                    <MenuItem icon="📧" label="Correo de respaldo" sub={backupEmail || 'Sin configurar'} color={Colors.primary}
                        onPress={() => setEditVisible(true)} />
                    <MenuItem icon="📱" label="Teléfono de respaldo" sub={backupPhone || 'Sin configurar'} color="#06B6D4"
                        onPress={() => setEditVisible(true)} />
                </View>

                {/* Zona peligrosa */}
                <View style={styles.dangerZone}>
                    <Text style={styles.dangerTitle}>⚠️ Zona peligrosa</Text>
                    <Pressable style={styles.signOutBtn} onPress={signOut}>
                        <Text style={styles.signOutIcon}>🚪</Text>
                        <Text style={styles.signOutText}>Cerrar sesión</Text>
                        <Text style={styles.signOutArrow}>›</Text>
                    </Pressable>
                    <Pressable style={styles.deleteBtn} onPress={handleDeleteAccount}>
                        <Text style={styles.deleteText}>Eliminar cuenta permanentemente</Text>
                    </Pressable>
                </View>

            </ScrollView>

            {/* Modal editar perfil */}
            <Modal visible={editVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Editar perfil</Text>

                        <Text style={styles.inputLabel}>Nombre visible</Text>
                        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName}
                            placeholder="Tu nombre" placeholderTextColor={Colors.textMuted} maxLength={50} />

                        <Text style={styles.inputLabel}>Teléfono</Text>
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                            placeholder="+51 999 999 999" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />

                        <Text style={styles.inputLabel}>Correo de respaldo</Text>
                        <TextInput style={styles.input} value={backupEmail} onChangeText={setBackupEmail}
                            placeholder="correo_alternativo@email.com" placeholderTextColor={Colors.textMuted}
                            keyboardType="email-address" autoCapitalize="none" />

                        <Text style={styles.inputLabel}>Teléfono de respaldo</Text>
                        <TextInput style={styles.input} value={backupPhone} onChangeText={setBackupPhone}
                            placeholder="+51 999 999 999" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />

                        <Button title="Guardar cambios" variant="primary" fullWidth loading={saving}
                            onPress={handleSaveProfile} style={{ marginTop: Spacing.lg }} />
                        <Button title="Cancelar" variant="ghost" fullWidth
                            onPress={() => setEditVisible(false)} style={{ marginTop: Spacing.sm }} />
                    </View>
                </View>
            </Modal>

            {/* Modal eliminar cuenta */}
            <Modal visible={deleteModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.dangerIconBox}>
                            <Text style={{ fontSize: 36 }}>🗑️</Text>
                        </View>
                        <Text style={[styles.modalTitle, { color: Colors.danger }]}>Confirma la eliminación</Text>
                        <Text style={styles.modalSub}>Escribe tu correo exactamente para confirmar:</Text>
                        <Text style={styles.modalEmail}>{user?.email}</Text>
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>⚠️ Al confirmar, tu cuenta y TODOS tus datos serán eliminados permanentemente.</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { borderColor: Colors.danger, marginTop: Spacing.md }]}
                            value={deleteOtp}
                            onChangeText={setDeleteOtp}
                            placeholder="Escribe tu correo aquí"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoFocus
                        />
                        <Button title="Eliminar mi cuenta definitivamente" variant="danger" fullWidth
                            loading={deleteLoading} onPress={confirmDeletion} style={{ marginTop: Spacing.lg }} />
                        <Button title="Cancelar — mantener mi cuenta" variant="ghost" fullWidth
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
    content: { paddingBottom: 48 },

    header: { paddingHorizontal: Spacing.xl, paddingTop: 52, paddingBottom: Spacing.xxl, position: 'relative', overflow: 'hidden' },
    headerBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bgAlt, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, ...Shadows.card },
    backIcon: { fontSize: 18, color: Colors.text, fontWeight: '700' },
    headerTitle: { ...Typography.h1, color: Colors.text },

    avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl },
    avatarRing: { position: 'relative', marginBottom: Spacing.md },
    avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.glow },
    avatarText: { fontSize: 36, fontWeight: '900', color: '#fff' },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: Colors.bg },
    verifiedIcon: { fontSize: 12, color: '#fff', fontWeight: '900' },
    avatarName: { fontSize: 22, fontWeight: '900', color: Colors.text, marginBottom: 4 },
    avatarEmail: { ...Typography.body, color: Colors.textSoft, marginBottom: Spacing.sm },
    memberBadge: { backgroundColor: Colors.primaryLight, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 5, marginBottom: Spacing.md },
    memberText: { fontSize: 12, fontWeight: '600', color: Colors.primaryDark },
    editBtn: { backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingHorizontal: 20, paddingVertical: 9, borderWidth: 1.5, borderColor: Colors.primary, ...Shadows.card },
    editBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

    section: { backgroundColor: Colors.surface, marginHorizontal: Spacing.xl, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.card },
    sectionLabel: { ...Typography.label, color: Colors.textMuted, marginBottom: Spacing.md },

    dangerZone: { marginHorizontal: Spacing.xl, backgroundColor: Colors.dangerLight, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1.5, borderColor: '#FECACA', marginTop: Spacing.sm },
    dangerTitle: { ...Typography.label, color: Colors.danger, marginBottom: Spacing.md },
    signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
    signOutIcon: { fontSize: 20 },
    signOutText: { ...Typography.bodyBold, color: Colors.text, flex: 1 },
    signOutArrow: { fontSize: 22, color: Colors.textMuted },
    deleteBtn: { alignItems: 'center', paddingVertical: Spacing.md },
    deleteText: { fontSize: 13, fontWeight: '700', color: Colors.danger, textDecorationLine: 'underline' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingBottom: 36 },
    modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
    dangerIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.dangerLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.md },
    modalTitle: { ...Typography.h2, color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
    modalSub: { ...Typography.body, color: Colors.textSoft, textAlign: 'center' },
    modalEmail: { ...Typography.bodyBold, color: Colors.text, textAlign: 'center', marginTop: 4 },
    warningBox: { backgroundColor: Colors.dangerLight, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: '#FECACA', marginTop: Spacing.md },
    warningText: { ...Typography.caption, color: '#B91C1C', textAlign: 'center', lineHeight: 18 },
    inputLabel: { ...Typography.bodyBold, color: Colors.text, marginBottom: Spacing.xs, marginTop: Spacing.md },
    input: { backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.md, ...Typography.body, color: Colors.text },
});
