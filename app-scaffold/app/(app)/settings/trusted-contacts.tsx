// 📁 cercania/app-scaffold/app/(app)/settings/trusted-contacts.tsx
/**
 * Pantalla de Contactos de Confianza.
 * El usuario designa entre 3-5 personas que pueden ayudarle a recuperar su cuenta.
 * También ve solicitudes pendientes de otros usuarios.
 */
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Pressable, ScrollView,
    StyleSheet, Text, TextInput, View
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../../src/components/ui/Button';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../../src/lib/theme';
import { useAuth } from '../../../src/store/auth';
import { getSupabase } from '../../../src/lib/supabase';

interface TrustedContact {
    id: string;
    contact_id: string;
    status: 'pending' | 'accepted' | 'rejected';
    profiles: { display_name: string };
}

interface PendingRequest {
    id: string;
    user_id: string;
    profiles: { display_name: string; backup_email: string };
}

export default function TrustedContactsScreen() {
    const { user } = useAuth();
    const [contacts, setContacts] = useState<TrustedContact[]>([]);
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResult, setSearchResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const sb = await getSupabase();
            // Mis contactos de confianza
            const { data: myContacts } = await sb
                .from('trusted_contacts')
                .select('id, contact_id, status, profiles:contact_id(display_name)')
                .eq('user_id', user?.id);
            setContacts((myContacts ?? []) as any);

            // Solicitudes pendientes donde me piden a mí
            const { data: requests } = await sb
                .from('trusted_contacts')
                .select('id, user_id, profiles:user_id(display_name, backup_email)')
                .eq('contact_id', user?.id)
                .eq('status', 'pending');
            setPendingRequests((requests ?? []) as any);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const searchUser = async () => {
        if (!searchEmail.trim()) return;
        setSearching(true);
        setSearchResult(null);
        try {
            const sb = await getSupabase();
            const { data, error } = await sb.rpc('find_user_by_email', {
                p_email: searchEmail.trim().toLowerCase()
            });
            if (error || !data) {
                Alert.alert('No encontrado', 'No hay usuario con ese correo en Cercanía.');
            } else if (data.id === user?.id) {
                Alert.alert('Error', 'No puedes agregarte a ti mismo.');
            } else {
                setSearchResult(data);
            }
        } catch {
            Alert.alert('No encontrado', 'No hay usuario con ese correo en Cercanía.');
        } finally {
            setSearching(false);
        }
    };

    const inviteContact = async (contactId: string, name: string) => {
        if (contacts.filter(c => c.status === 'accepted').length >= 5) {
            Alert.alert('Límite alcanzado', 'Máximo 5 contactos de confianza.');
            return;
        }
        setAdding(true);
        try {
            const sb = await getSupabase();
            await sb.rpc('invite_trusted_contact', { p_contact_id: contactId });
            Alert.alert('Invitación enviada', `${name} recibirá una solicitud para ser tu contacto de confianza.`);
            setSearchResult(null);
            setSearchEmail('');
            load();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setAdding(false);
        }
    };

    const respondRequest = async (requestId: string, accept: boolean, name: string) => {
        try {
            const sb = await getSupabase();
            await sb.rpc('respond_trusted_contact', { p_request_id: requestId, p_accept: accept });
            Alert.alert(
                accept ? 'Aceptado' : 'Rechazado',
                accept
                    ? `Ahora puedes ayudar a ${name} a recuperar su cuenta si lo necesita.`
                    : `Rechazaste la solicitud de ${name}.`
            );
            load();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const removeContact = (contactId: string, name: string) => {
        Alert.alert('Eliminar contacto', `¿Eliminar a ${name} de tus contactos de confianza?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive',
                onPress: async () => {
                    const sb = await getSupabase();
                    await sb.from('trusted_contacts').delete()
                        .eq('id', contactId).eq('user_id', user?.id);
                    load();
                }
            }
        ]);
    };

    const acceptedContacts = contacts.filter(c => c.status === 'accepted');
    const pendingContacts = contacts.filter(c => c.status === 'pending');

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
                <Text style={styles.backText}>← Volver</Text>
            </Pressable>

            <Text style={styles.title}>Contactos de confianza</Text>
            <Text style={styles.subtitle}>
                Estas personas pueden ayudarte a recuperar tu cuenta si pierdes acceso.
                Necesitarás que al menos 3 aprueben la solicitud.
            </Text>

            {/* Solicitudes pendientes para mí */}
            {pendingRequests.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📬 Solicitudes pendientes</Text>
                    {pendingRequests.map(req => (
                        <View key={req.id} style={styles.requestCard}>
                            <View style={styles.requestInfo}>
                                <Text style={styles.requestName}>{req.profiles?.display_name ?? 'Usuario'}</Text>
                                <Text style={styles.requestSub}>quiere que seas su contacto de confianza</Text>
                            </View>
                            <View style={styles.requestActions}>
                                <Pressable style={styles.acceptBtn} onPress={() => respondRequest(req.id, true, req.profiles?.display_name)}>
                                    <Text style={styles.acceptBtnText}>Aceptar</Text>
                                </Pressable>
                                <Pressable style={styles.rejectBtn} onPress={() => respondRequest(req.id, false, req.profiles?.display_name)}>
                                    <Text style={styles.rejectBtnText}>Rechazar</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Mis contactos aceptados */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🛡️ Mis contactos ({acceptedContacts.length}/5)</Text>
                </View>
                {loading ? (
                    <ActivityIndicator color={Colors.primary} />
                ) : acceptedContacts.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No tienes contactos de confianza aún.</Text>
                        <Text style={styles.emptyHint}>Agrega entre 3 y 5 personas de confianza.</Text>
                    </View>
                ) : (
                    acceptedContacts.map(c => (
                        <View key={c.id} style={styles.contactCard}>
                            <View style={styles.contactAvatar}>
                                <Text style={styles.contactInitial}>
                                    {c.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
                                </Text>
                            </View>
                            <Text style={styles.contactName}>{c.profiles?.display_name ?? 'Usuario'}</Text>
                            <Pressable onPress={() => removeContact(c.id, c.profiles?.display_name)} hitSlop={8}>
                                <Text style={styles.removeIcon}>✕</Text>
                            </Pressable>
                        </View>
                    ))
                )}

                {/* Pendientes enviados */}
                {pendingContacts.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>⏳ Invitaciones enviadas</Text>
                        {pendingContacts.map(c => (
                            <View key={c.id} style={[styles.contactCard, { opacity: 0.6 }]}>
                                <View style={[styles.contactAvatar, { backgroundColor: Colors.textMuted }]}>
                                    <Text style={styles.contactInitial}>
                                        {c.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
                                    </Text>
                                </View>
                                <Text style={styles.contactName}>{c.profiles?.display_name ?? 'Usuario'}</Text>
                                <Text style={styles.pendingBadge}>Pendiente</Text>
                            </View>
                        ))}
                    </>
                )}
            </View>

            {/* Agregar nuevo contacto */}
            {acceptedContacts.length < 5 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>➕ Agregar contacto</Text>
                    <Text style={styles.sectionDesc}>
                        Ingresa el correo electrónico del usuario que quieres agregar.
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={searchEmail}
                        onChangeText={setSearchEmail}
                        placeholder="correo_respaldo@email.com"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <Button
                        title="Buscar usuario"
                        variant="secondary"
                        fullWidth
                        loading={searching}
                        onPress={searchUser}
                        style={{ marginTop: Spacing.sm }}
                    />
                    {searchResult && (
                        <View style={styles.searchResult}>
                            <View style={styles.contactAvatar}>
                                <Text style={styles.contactInitial}>
                                    {searchResult.display_name?.[0]?.toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.contactName}>{searchResult.display_name}</Text>
                            <Button
                                title="Invitar"
                                variant="primary"
                                size="sm"
                                loading={adding}
                                onPress={() => inviteContact(searchResult.id, searchResult.display_name)}
                            />
                        </View>
                    )}
                </View>
            )}

            {/* Info sobre la recuperación */}
            <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>🔐 ¿Cómo funciona?</Text>
                <Text style={styles.infoText}>
                    • Si pierdes acceso a tu cuenta, puedes iniciar una recuperación social.{'\n'}
                    • Al menos 3 de tus contactos deben aprobar la solicitud.{'\n'}
                    • Hay 48 horas de espera para protegerte de intentos no autorizados.{'\n'}
                    • Si alguien intenta recuperar tu cuenta sin tu permiso, puedes cancelarlo desde la pantalla de login.
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
    subtitle: { ...Typography.body, color: Colors.textSoft, marginTop: Spacing.xs, marginBottom: Spacing.xl, lineHeight: 22 },
    section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.card },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.md },
    sectionDesc: { ...Typography.caption, color: Colors.textSoft, marginBottom: Spacing.md },
    emptyBox: { alignItems: 'center', paddingVertical: Spacing.lg },
    emptyText: { ...Typography.body, color: Colors.textSoft },
    emptyHint: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },
    contactCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
    contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    contactInitial: { color: '#fff', fontWeight: '700' },
    contactName: { ...Typography.bodyBold, color: Colors.text, flex: 1 },
    removeIcon: { fontSize: 18, color: Colors.textMuted, padding: 4 },
    pendingBadge: { ...Typography.caption, color: Colors.textMuted, backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    requestCard: { backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.primary },
    requestInfo: { marginBottom: Spacing.sm },
    requestName: { ...Typography.bodyBold, color: Colors.primaryDark },
    requestSub: { ...Typography.caption, color: Colors.primary },
    requestActions: { flexDirection: 'row', gap: Spacing.sm },
    acceptBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center' },
    acceptBtnText: { ...Typography.bodyBold, color: '#fff' },
    rejectBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    rejectBtnText: { ...Typography.bodyBold, color: Colors.textSoft },
    input: { backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.md, ...Typography.body, color: Colors.text },
    searchResult: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.md },
    infoBox: { backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '44' },
    infoTitle: { ...Typography.h3, color: Colors.primaryDark, marginBottom: Spacing.sm },
    infoText: { ...Typography.body, color: Colors.primaryDark, lineHeight: 22 }
});