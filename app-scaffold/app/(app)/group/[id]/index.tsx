// 📁 cercania/app-scaffold/app/(app)/group/[id]/index.tsx
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
    Modal,
    ActivityIndicator,
    Clipboard
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../../src/components/ui/Button';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../../../src/lib/theme';
import { useAuth } from '../../../../src/store/auth';
import { useGroups } from '../../../../src/store/groups';
import { getSupabase } from '../../../../src/lib/supabase';

export default function GroupDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const currentUserId = useAuth(s => s.user?.id);
    const { groups, loadGroups, leaveGroup } = useGroups();
    const group = groups.find(g => g.id === id);

    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editVisible, setEditVisible] = useState(false);
    const [newName, setNewName] = useState(group?.name ?? '');
    const [saving, setSaving] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [inviteVisible, setInviteVisible] = useState(false);
    const [loadingCode, setLoadingCode] = useState(false);

    const loadMembers = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const sb = await getSupabase();
            const { data, error } = await sb
                .from('group_members')
                .select('user_id, role, nickname, joined_at, profiles(display_name, avatar_url)')
                .eq('group_id', id);
            if (error) throw error;
            setMembers(data ?? []);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadMembers(); }, [id]);

    const handleLeave = () => {
        Alert.alert(
            'Salir del grupo',
            `¿Seguro que quieres salir de "${group?.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Salir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await leaveGroup(id!);
                            router.replace('/(app)/home');
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    }
                }
            ]
        );
    };

    const handleSaveName = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const sb = await getSupabase();
            const { error } = await sb
                .from('groups')
                .update({ name: newName.trim() })
                .eq('id', id);
            if (error) throw error;
            await loadGroups();
            setEditVisible(false);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const loadInviteCode = async () => {
        setLoadingCode(true);
        try {
            const sb = await getSupabase();
            // Buscar código activo existente
            const { data } = await sb
                .from('invite_codes')
                .select('code')
                .eq('group_id', id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data?.code) {
                setInviteCode(data.code);
            } else {
                // Crear nuevo código via RPC
                const { data: newCode, error } = await sb.rpc('create_group_with_invite', {
                    p_group_id: id
                });
                if (error) throw error;
                setInviteCode(newCode?.invite_code ?? null);
            }
            setInviteVisible(true);
        } catch (e: any) {
            // Si el RPC falla, generar código directo
            try {
                const sb = await getSupabase();
                const { data: newCode, error } = await sb
                    .from('invite_codes')
                    .insert({ group_id: id, is_active: true })
                    .select('code')
                    .single();
                if (error) throw error;
                setInviteCode(newCode?.code ?? null);
                setInviteVisible(true);
            } catch (e2: any) {
                Alert.alert('Error', 'No se pudo obtener el código de invitación.');
            }
        } finally {
            setLoadingCode(false);
        }
    };

    const handleShareCode = async () => {
        if (!inviteCode) return;
        try {
            await Share.share({
                message: `¡Únete a mi grupo "${group?.name}" en Cercanía!\n\nCódigo de invitación: *${inviteCode}*\n\nDescarga la app en: https://cercania.vercel.app`,
                title: `Invitación al grupo ${group?.name}`,
            });
        } catch (e: any) {
            console.warn(e.message);
        }
    };

    const handleCopyCode = () => {
        if (!inviteCode) return;
        Clipboard.setString(inviteCode);
        Alert.alert('Copiado ✅', `El código "${inviteCode}" está en tu portapapeles.`);
    };

    const isOwner = group?.owner_id === currentUserId;

    if (!group) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Grupo no encontrado</Text>
                <Button title="Volver" variant="ghost" onPress={() => router.back()} />
            </View>
        );
    }

    return (
        <>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMembers} />}
            >
                {/* Header */}
                <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
                    <Text style={styles.backText}>← Volver</Text>
                </Pressable>

                {/* Info del grupo */}
                <View style={styles.groupHeader}>
                    <View style={[styles.groupEmoji, { backgroundColor: group.color + '22' }]}>
                        <Text style={styles.groupEmojiText}>{group.emoji}</Text>
                    </View>
                    <View style={styles.groupInfo}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Text style={styles.groupSub}>{members.length} miembro{members.length !== 1 ? 's' : ''}</Text>
                    </View>
                    {isOwner && (
                        <Pressable onPress={() => { setNewName(group.name); setEditVisible(true); }} hitSlop={10}>
                            <Text style={styles.editIcon}>✏️</Text>
                        </Pressable>
                    )}
                </View>

                {/* Botón ver mapa */}
                <Pressable
                    style={styles.mapBtn}
                    onPress={() => router.push({ pathname: '/(app)/map/[groupId]', params: { groupId: id } })}
                >
                    <Text style={styles.mapBtnIcon}>🗺️</Text>
                    <View>
                        <Text style={styles.mapBtnTitle}>Ver mapa en tiempo real</Text>
                        <Text style={styles.mapBtnSub}>Mira dónde está cada miembro ahora</Text>
                    </View>
                    <Text style={styles.mapBtnArrow}>›</Text>
                </Pressable>

                {/* Botón chat grupal */}
                <Pressable
                    style={[styles.mapBtn, { marginTop: 8 }]}
                    onPress={() => router.push({ pathname: '/(app)/group/[id]/chat', params: { id } })}
                >
                    <Text style={styles.mapBtnIcon}>💬</Text>
                    <View>
                        <Text style={styles.mapBtnTitle}>Chat del grupo</Text>
                        <Text style={styles.mapBtnSub}>Mensajes rápidos de ubicación</Text>
                    </View>
                    <Text style={styles.mapBtnArrow}>›</Text>
                </Pressable>

                {/* Botón invitar */}
                <Pressable
                    style={[styles.mapBtn, { marginTop: 0, marginBottom: Spacing.xl, borderColor: '#8B5CF6', backgroundColor: '#F5F3FF' }]}
                    onPress={loadInviteCode}
                    disabled={loadingCode}
                >
                    <Text style={styles.mapBtnIcon}>🔗</Text>
                    <View>
                        <Text style={[styles.mapBtnTitle, { color: '#6D28D9' }]}>
                            {loadingCode ? 'Cargando código...' : 'Invitar al grupo'}
                        </Text>
                        <Text style={[styles.mapBtnSub, { color: '#7C3AED' }]}>Ver código y compartir por WhatsApp</Text>
                    </View>
                    {loadingCode
                        ? <ActivityIndicator size="small" color="#7C3AED" style={{ marginLeft: 'auto' }} />
                        : <Text style={[styles.mapBtnArrow, { color: '#7C3AED' }]}>›</Text>
                    }
                </Pressable>

                {/* Lista de miembros */}
                <Text style={styles.sectionTitle}>Miembros</Text>

                {loading ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />
                ) : (
                    <View style={styles.memberList}>
                        {members.map((m: any) => {
                            const isMe = m.user_id === currentUserId;
                            const isGroupOwner = m.user_id === group.owner_id;
                            return (
                                <View key={m.user_id} style={styles.memberRow}>
                                    <View style={styles.memberAvatar}>
                                        <Text style={styles.memberInitial}>
                                            {m.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
                                        </Text>
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>
                                            {m.profiles?.display_name ?? 'Usuario'}
                                            {isMe ? ' (Tú)' : ''}
                                        </Text>
                                        <Text style={styles.memberRole}>
                                            {isGroupOwner ? '👑 Admin' : '👤 Miembro'}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Salir del grupo */}
                <View style={styles.dangerZone}>
                    <Button
                        title="Salir del grupo"
                        variant="danger"
                        fullWidth
                        onPress={handleLeave}
                    />
                </View>
            </ScrollView>

            {/* Modal código de invitación */}
            <Modal visible={inviteVisible} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>🔗 Código de invitación</Text>
                        <Text style={[Typography.caption, { color: Colors.textSoft, marginBottom: Spacing.lg }]}>
                            Comparte este código con quien quieras invitar al grupo "{group?.name}".
                        </Text>

                        {/* Código grande */}
                        <Pressable onPress={handleCopyCode} style={styles.codeBox}>
                            <Text style={styles.codeText}>{inviteCode}</Text>
                            <Text style={styles.codeCopy}>Toca para copiar 📋</Text>
                        </Pressable>

                        {/* Botón compartir */}
                        <Pressable style={styles.shareBtn} onPress={handleShareCode}>
                            <Text style={styles.shareBtnText}>📤 Compartir por WhatsApp / SMS</Text>
                        </Pressable>

                        <Button title="Cerrar" variant="ghost" fullWidth
                            onPress={() => setInviteVisible(false)}
                            style={{ marginTop: Spacing.sm }} />
                    </View>
                </View>
            </Modal>

            {/* Modal editar nombre */}
            <Modal visible={editVisible} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Editar nombre</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={newName}
                            onChangeText={setNewName}
                            maxLength={40}
                            autoFocus
                            placeholderTextColor={Colors.textMuted}
                        />
                        <View style={styles.modalActions}>
                            <Button title="Cancelar" variant="ghost" onPress={() => setEditVisible(false)} />
                            <Button title="Guardar" variant="primary" loading={saving} onPress={handleSaveName} />
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    errorText: { ...Typography.body, color: Colors.danger },

    back: { marginBottom: Spacing.lg },
    backText: { ...Typography.body, color: Colors.textSoft },

    groupHeader: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.card
    },
    groupEmoji: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    groupEmojiText: { fontSize: 30 },
    groupInfo: { flex: 1 },
    groupName: { ...Typography.h2, color: Colors.text },
    groupSub: { ...Typography.caption, color: Colors.textSoft, marginTop: 2 },
    editIcon: { fontSize: 20 },

    mapBtn: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: Colors.primaryLight, borderRadius: Radius.lg,
        padding: Spacing.lg, marginBottom: Spacing.xl,
        borderWidth: 1.5, borderColor: Colors.primary
    },
    mapBtnIcon: { fontSize: 28 },
    mapBtnTitle: { ...Typography.bodyBold, color: Colors.primaryDark },
    mapBtnSub: { ...Typography.caption, color: Colors.primary, marginTop: 2 },
    mapBtnArrow: { fontSize: 24, color: Colors.primary, marginLeft: 'auto' },

    sectionTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.md },
    memberList: { gap: Spacing.sm, marginBottom: Spacing.xl },
    memberRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        padding: Spacing.md, ...Shadows.card
    },
    memberAvatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center'
    },
    memberInitial: { color: '#fff', ...Typography.h3 },
    memberInfo: { flex: 1 },
    memberName: { ...Typography.bodyBold, color: Colors.text },
    memberRole: { ...Typography.caption, color: Colors.textSoft, marginTop: 2 },

    dangerZone: { marginTop: Spacing.xl },
    codeBox: {
        backgroundColor: '#F5F3FF', borderRadius: Radius.xl,
        padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg,
        borderWidth: 2, borderColor: '#8B5CF6', borderStyle: 'dashed',
    },
    codeText: { fontSize: 36, fontWeight: '900', color: '#6D28D9', letterSpacing: 6 },
    codeCopy: { fontSize: 12, color: '#7C3AED', marginTop: 6 },
    shareBtn: {
        backgroundColor: '#25D366', borderRadius: Radius.lg,
        paddingVertical: 14, alignItems: 'center', marginBottom: Spacing.sm,
    },
    shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    modal: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, width: '100%' },
    modalTitle: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.lg },
    modalInput: {
        backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
        borderRadius: Radius.lg, padding: Spacing.lg, ...Typography.body, color: Colors.text,
        marginBottom: Spacing.lg
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm }
});