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

export default function ProfileScreen() {
    const { profile, user, refreshProfile, signOut } = useAuth();
    const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
    const [phone, setPhone] = useState(profile?.phone ?? '');
    const [backupEmail, setBackupEmail] = useState(profile?.backup_email ?? '');
    const [backupPhone, setBackupPhone] = useState(profile?.backup_phone ?? '');
    const [saving, setSaving] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailSection, setEmailSection] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [passwordSection, setPasswordSection] = useState(false);

    // Estado eliminación
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteOtp, setDeleteOtp] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

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
            Alert.alert('Perfil actualizado ✅');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally { setSaving(false); }
    };

    const handleChangeEmail = async () => {
        if (!newEmail.trim()) return;
        setSaving(true);
        try {
            const sb = await getSupabase();
            const { error } = await sb.auth.updateUser({ email: newEmail.trim().toLowerCase() });
            if (error) throw error;
            Alert.alert('Revisa tu correo', 'Te enviamos un enlace de confirmación.');
            setNewEmail(''); setEmailSection(false);
        } catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
    };

    const handleChangePassword = async () => {
        if (!newPassword.trim() || newPassword.length < 8) {
            Alert.alert('La contraseña debe tener al menos 8 caracteres'); return;
        }
        setSaving(true);
        try {
            const sb = await getSupabase();
            const { error } = await sb.auth.updateUser({ password: newPassword });
            if (error) throw error;
            Alert.alert('Contraseña actualizada ✅');
            setNewPassword(''); setPasswordSection(false);
        } catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
    };

    // ─── ELIMINACIÓN DE CUENTA (3 pasos) ────────────────────

    // Paso 1: primera confirmación
    const handleDeleteAccount = () => {
        Alert.alert(
            '⚠️ Eliminar cuenta',
            'Esta acción es PERMANENTE e irreversible.\n\nSe eliminarán:\n• Tu perfil y todos tus datos\n• Tus grupos familiares\n• Tu historial de ubicaciones\n• Todas tus alertas SOS\n• Tus contactos de confianza\n\n¿Estás seguro de continuar?',
            [
                { text: 'No, cancelar', style: 'cancel' },
                { text: 'Continuar →', style: 'destructive', onPress: handleDeleteConfirm2 }
            ]
        );
    };

    // Paso 2: segunda confirmación
    const handleDeleteConfirm2 = () => {
        Alert.alert(
            '🚨 Última advertencia',
            `¿Realmente deseas eliminar tu cuenta "${profile?.display_name ?? user?.email}"?\n\nTu familia perderá acceso a tu ubicación para siempre. Esta acción NO se puede deshacer.`,
            [
                { text: 'No, mantener mi cuenta', style: 'cancel' },
                { text: 'Sí, eliminar definitivamente', style: 'destructive', onPress: sendDeletionCode }
            ]
        );
    };

    // Paso 3: enviar código de verificación al email
    const sendDeletionCode = async () => {
        setDeleteModalVisible(true);
    };

    // Paso 4: verificar código y eliminar
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

    return (
        <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
                    <Text style={styles.backText}>← Volver</Text>
                </Pressable>
                <Text style={styles.title}>Mi perfil</Text>

                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials || '?'}</Text>
                    </View>
                    <Text style={styles.avatarEmail}>{user?.email}</Text>
                    <Text style={styles.avatarSub}>
                        Miembro desde {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'long' }) : ''}
                    </Text>
                </View>

                {/* Info básica */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información básica</Text>
                    <Text style={styles.label}>Nombre visible</Text>
                    <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Tu nombre" placeholderTextColor={Colors.textMuted} maxLength={50} />
                    <Text style={styles.label}>Teléfono</Text>
                    <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+51 999 999 999" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
                    <Button title="Guardar cambios" variant="primary" fullWidth loading={saving} onPress={handleSaveProfile} style={{ marginTop: Spacing.md }} />
                </View>

                {/* Datos de respaldo */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recuperación de cuenta</Text>
                    <Text style={styles.sectionDesc}>Usados para recuperar tu cuenta si pierdes acceso.</Text>
                    <Text style={styles.label}>Correo de respaldo</Text>
                    <TextInput style={styles.input} value={backupEmail} onChangeText={setBackupEmail} placeholder="correo_alternativo@email.com" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
                    <Text style={styles.label}>Teléfono de respaldo</Text>
                    <TextInput style={styles.input} value={backupPhone} onChangeText={setBackupPhone} placeholder="+51 999 999 999" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
                    <Button title="Guardar datos de respaldo" variant="secondary" fullWidth loading={saving} onPress={handleSaveProfile} style={{ marginTop: Spacing.md }} />
                </View>

                {/* Privacidad */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Privacidad y seguridad</Text>
                    <Pressable style={styles.menuItem} onPress={() => router.push('/(app)/settings/invisible-mode')}>
                        <Text style={styles.menuEmoji}>👁️‍🗨️</Text>
                        <View style={styles.menuInfo}>
                            <Text style={styles.menuTitle}>Modo invisible</Text>
                            <Text style={styles.menuSub}>Pausa tu ubicación temporalmente</Text>
                        </View>
                        <Text style={styles.menuArrow}>›</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => router.push('/(app)/settings/trusted-contacts')}>
                        <Text style={styles.menuEmoji}>🛡️</Text>
                        <View style={styles.menuInfo}>
                            <Text style={styles.menuTitle}>Contactos de confianza</Text>
                            <Text style={styles.menuSub}>Para recuperación de cuenta</Text>
                        </View>
                        <Text style={styles.menuArrow}>›</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => router.push('/(app)/settings/biometric')}>
                        <Text style={styles.menuEmoji}>🔐</Text>
                        <View style={styles.menuInfo}>
                            <Text style={styles.menuTitle}>Biometría</Text>
                            <Text style={styles.menuSub}>Huella / Face ID al abrir la app</Text>
                        </View>
                        <Text style={styles.menuArrow}>›</Text>
                    </Pressable>
                </View>

                {/* Cambiar email */}
                <View style={styles.section}>
                    <Pressable style={styles.sectionToggle} onPress={() => setEmailSection(!emailSection)}>
                        <Text style={styles.sectionTitle}>Cambiar correo principal</Text>
                        <Text style={styles.toggleIcon}>{emailSection ? '▲' : '▼'}</Text>
                    </Pressable>
                    {emailSection && (
                        <>
                            <Text style={styles.label}>Nuevo correo</Text>
                            <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} placeholder="nuevo@correo.com" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
                            <Text style={styles.hint}>Recibirás un enlace de confirmación.</Text>
                            <Button title="Actualizar correo" variant="secondary" fullWidth loading={saving} onPress={handleChangeEmail} style={{ marginTop: Spacing.md }} />
                        </>
                    )}
                </View>

                {/* Cambiar contraseña */}
                <View style={styles.section}>
                    <Pressable style={styles.sectionToggle} onPress={() => setPasswordSection(!passwordSection)}>
                        <Text style={styles.sectionTitle}>Cambiar contraseña</Text>
                        <Text style={styles.toggleIcon}>{passwordSection ? '▲' : '▼'}</Text>
                    </Pressable>
                    {passwordSection && (
                        <>
                            <Text style={styles.label}>Nueva contraseña</Text>
                            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Mínimo 8 caracteres" placeholderTextColor={Colors.textMuted} secureTextEntry />
                            <Button title="Actualizar contraseña" variant="secondary" fullWidth loading={saving} onPress={handleChangePassword} style={{ marginTop: Spacing.md }} />
                        </>
                    )}
                </View>

                {/* Zona peligrosa */}
                <View style={styles.danger}>
                    <Text style={styles.dangerTitle}>⚠️ Zona peligrosa</Text>
                    <Text style={styles.dangerDesc}>
                        Estas acciones son irreversibles. Procede con cuidado.
                    </Text>
                    <Button title="Cerrar sesión" variant="ghost" fullWidth onPress={signOut} />
                    <Button
                        title="Eliminar cuenta permanentemente"
                        variant="danger"
                        fullWidth
                        loading={deleteLoading}
                        onPress={handleDeleteAccount}
                        style={{ marginTop: Spacing.sm }}
                    />
                </View>
            </ScrollView>

            {/* Modal OTP eliminación */}
            <Modal visible={deleteModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.dangerIconBox}>
                            <Text style={styles.dangerIcon}>🗑️</Text>
                        </View>
                        <Text style={styles.modalTitle}>Confirma la eliminación</Text>
                        <Text style={styles.modalText}>
                            Enviamos un enlace de verificación a:
                        </Text>
                        <Text style={styles.modalEmail}>{user?.email}</Text>
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>
                                ⚠️ Al ingresar el código tu cuenta y TODOS tus datos serán eliminados de forma permanente.
                            </Text>
                        </View>
                        <Text style={styles.otpLabel}>Código de verificación</Text>
                        <TextInput
                            style={styles.otpInput}
                            value={deleteOtp}
                            onChangeText={v => setDeleteOtp(v.replace(/\D/g, '').slice(0, 8))}
                            placeholder="••••••••"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={8}
                            autoFocus
                        />
                        <Button
                            title="Eliminar mi cuenta definitivamente"
                            variant="danger"
                            fullWidth
                            loading={deleteLoading}
                            disabled={deleteOtp.length < 6}
                            onPress={confirmDeletion}
                            style={{ marginTop: Spacing.lg }}
                        />
                        <Button
                            title="Cancelar — mantener mi cuenta"
                            variant="ghost"
                            fullWidth
                            onPress={() => {
                                setDeleteModalVisible(false);
                                setDeleteOtp('');
                                setOtpSent(false);
                            }}
                            style={{ marginTop: Spacing.sm }}
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
    back: { marginBottom: Spacing.md },
    backText: { ...Typography.body, color: Colors.textSoft },
    title: { ...Typography.h1, color: Colors.text },
    avatarSection: { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.md },
    avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, ...Shadows.card },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
    avatarEmail: { ...Typography.bodyBold, color: Colors.text },
    avatarSub: { ...Typography.caption, color: Colors.textSoft, marginTop: 4 },
    section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.card },
    sectionToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.xs },
    sectionDesc: { ...Typography.caption, color: Colors.textSoft, marginBottom: Spacing.md },
    toggleIcon: { fontSize: 14, color: Colors.textSoft },
    label: { ...Typography.bodyBold, color: Colors.text, marginBottom: Spacing.xs, marginTop: Spacing.sm },
    input: { backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.md, ...Typography.body, color: Colors.text },
    hint: { ...Typography.caption, color: Colors.textMuted, marginTop: Spacing.xs },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
    menuEmoji: { fontSize: 24 },
    menuInfo: { flex: 1 },
    menuTitle: { ...Typography.bodyBold, color: Colors.text },
    menuSub: { ...Typography.caption, color: Colors.textSoft },
    menuArrow: { fontSize: 22, color: Colors.textMuted },
    danger: { backgroundColor: '#FEF2F2', borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.lg, borderWidth: 1, borderColor: '#FECACA' },
    dangerTitle: { ...Typography.h3, color: Colors.danger, marginBottom: Spacing.xs },
    dangerDesc: { ...Typography.caption, color: '#B91C1C', marginBottom: Spacing.md },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.sm },
    modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
    dangerIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.dangerLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.sm },
    dangerIcon: { fontSize: 36 },
    modalTitle: { ...Typography.h2, color: Colors.danger, textAlign: 'center' },
    modalText: { ...Typography.body, color: Colors.textSoft, textAlign: 'center' },
    modalEmail: { ...Typography.bodyBold, color: Colors.text, textAlign: 'center' },
    warningBox: { backgroundColor: Colors.dangerLight, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: '#FECACA' },
    warningText: { ...Typography.caption, color: '#B91C1C', textAlign: 'center', lineHeight: 18 },
    otpLabel: { ...Typography.bodyBold, color: Colors.text, marginTop: Spacing.sm },
    otpInput: { backgroundColor: Colors.surfaceAlt, borderWidth: 2, borderColor: Colors.danger, borderRadius: Radius.lg, padding: Spacing.lg, fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: 10, textAlign: 'center' },
});