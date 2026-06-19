import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Clipboard, Modal, Pressable,
    RefreshControl, ScrollView, Share, StyleSheet, Text,
    TextInput, View
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
                .select('user_id, role, joined_at, profiles(display_name, avatar_url)')
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
            const { error } = await sb.from('groups').update({ name: newName.trim() }).eq('id', id);
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
            // Buscar código vigente (no expirado) en la tabla correcta
            const { data, error } = await sb
                .from('group_invitations')
                .select('code, expires_at')
                .eq('group_id', id)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data?.code) {
                setInviteCode(data.code);
            } else {
                // No hay código vigente: generar uno nuevo vía RPC (respeta SECURITY DEFINER)
                const { data: rpcData, error: rpcError } = await sb
                    .rpc('create_group_invite', { p_group_id: id });
                if (rpcError) throw rpcError;
                setInviteCode(rpcData?.code ?? null);
            }
            setInviteVisible(true);
        } catch (e: any) {
            Alert.alert('Error', 'No se pudo obtener el código de invitación.');
        } finally {
            setLoadingCode(false);
        }
    };

    const handleShareCode = async () => {
        if (!inviteCode) return;
        try {
            await Share.share({
                message: `¡Únete a mi grupo "${group?.name}" en Cercanía!\n\nCódigo de invitación: *${inviteCode}*\n\nDescarga: https://cercania.vercel.app`,
                title: `Invitación — ${group?.name}`,
            });
        } catch { }
    };

    const handleCopyCode = () => {
        if (!inviteCode) return;
        Clipboard.setString(inviteCode);
        Alert.alert('¡Copiado! 📋', `El código "${inviteCode}" está en tu portapapeles.`);
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
                showsVerticalScrollIndicator={false}
            >
                {/* ── HEADER ── */}
                <View style={styles.header}>
                    <View style={styles.headerBg} />
                    <View style={[styles.headerCircle, { backgroundColor: (group.color ?? Colors.primary) }]} />

                    <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                        <Text style={styles.backIcon}>←</Text>
                    </Pressable>

                    <View style={styles.groupHero}>
                        <View style={[styles.groupAvatarBox, { backgroundColor: (group.color ?? Colors.primary) + '33' }]}>
                            <Text style={styles.groupAvatarEmoji}>{group.emoji}</Text>
                        </View>
                        <View style={styles.groupHeroInfo}>
                            <Text style={styles.groupHeroName}>{group.name}</Text>
                            <Text style={styles.groupHeroSub}>
                                {loading ? '...' : `${members.length} miembro${members.length !== 1 ? 's' : ''}`}
                            </Text>
                        </View>
                        {isOwner && (
                            <Pressable
                                hitSlop={12}
                                style={styles.editGroupBtn}
                                onPress={() => { setNewName(group.name); setEditVisible(true); }}
                            >
                                <Text style={styles.editGroupBtnText}>✏️</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* ── ACCIONES PRINCIPALES ── */}
                <View style={styles.actionsGrid}>
                    <Pressable
                        style={[styles.actionBig, { borderColor: Colors.primary, backgroundColor: Colors.primaryLight }]}
                        onPress={() => router.push({ pathname: '/(app)/map/[groupId]', params: { groupId: id } })}
                    >
                        <Text style={styles.actionBigEmoji}>🗺️</Text>
                        <Text style={[styles.actionBigTitle, { color: Colors.primaryDark }]}>Ver mapa</Text>
                        <Text style={[styles.actionBigSub, { color: Colors.primary }]}>Tiempo real</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.actionBig, { borderColor: '#6D28D9', backgroundColor: '#F5F3FF' }]}
                        onPress={loadInviteCode}
                        disabled={loadingCode}
                    >
                        {loadingCode
                            ? <ActivityIndicator color="#7C3AED" style={{ marginBottom: 4 }} />
                            : <Text style={styles.actionBigEmoji}>🔗</Text>
                        }
                        <Text style={[styles.actionBigTitle, { color: '#4C1D95' }]}>
                            {loadingCode ? 'Cargando...' : 'Invitar'}
                        </Text>
                        <Text style={[styles.actionBigSub, { color: '#7C3AED' }]}>Ver código</Text>
                    </Pressable>
                </View>

                {/* ── ACCIONES SECUNDARIAS ── */}
                <View style={styles.secondaryGrid}>
                    <Pressable
                        style={styles.secondaryCard}
                        onPress={() => router.push({ pathname: '/(app)/group/[id]/chat', params: { id } })}
                    >
                        <Text style={styles.secondaryEmoji}>💬</Text>
                        <Text style={styles.secondaryTitle}>Chat</Text>
                        <Text style={styles.secondarySub}>Mensajes del grupo</Text>
                    </Pressable>

                    <Pressable
                        style={styles.secondaryCard}
                        onPress={() => router.push({ pathname: '/(app)/settings/geofences', params: { groupId: id, groupName: group.name } })}
                    >
                        <Text style={styles.secondaryEmoji}>📍</Text>
                        <Text style={styles.secondaryTitle}>Zonas</Text>
                        <Text style={styles.secondarySub}>Lugares seguros</Text>
                    </Pressable>

                    <Pressable
                        style={styles.secondaryCard}
                        onPress={() => router.push({ pathname: '/(app)/map/[groupId]', params: { groupId: id } })}
                    >
                        <Text style={styles.secondaryEmoji}>🆘</Text>
                        <Text style={styles.secondaryTitle}>SOS</Text>
                        <Text style={styles.secondarySub}>Ver alertas</Text>
                    </Pressable>
                </View>

                {/* ── MIEMBROS ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>MIEMBROS</Text>
                    <Text style={styles.sectionCount}>{loading ? '...' : members.length}</Text>
                </View>

                {loading ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
                ) : (
                    <View style={styles.memberList}>
                        {members.map((m: any) => {
                            const isMe = m.user_id === currentUserId;
                            const isGroupOwner = m.user_id === group.owner_id;
                            const name = m.profiles?.display_name ?? 'Usuario';
                            const initial = name[0]?.toUpperCase() ?? '?';
                            return (
                                <View key={m.user_id} style={[styles.memberRow, isMe && styles.memberRowMe]}>
                                    <View style={[styles.memberAvatar, { backgroundColor: isGroupOwner ? Colors.primary : Colors.surfaceAlt }]}>
                                        <Text style={[styles.memberInitial, !isGroupOwner && { color: Colors.text }]}>
                                            {initial}
                                        </Text>
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>
                                            {name}{isMe ? ' · Tú' : ''}
                                        </Text>
                                        <Text style={styles.memberRole}>
                                            {isGroupOwner ? '👑 Administrador' : '👤 Miembro'}
                                        </Text>
                                    </View>
                                    {isMe && (
                                        <View style={styles.meChip}>
                                            <Text style={styles.meChipText}>Yo</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* ── ZONA PELIGROSA ── */}
                <View style={styles.dangerZone}>
                    <Text style={styles.dangerLabel}>ZONA PELIGROSA</Text>
                    <Pressable style={styles.leaveBtn} onPress={handleLeave}>
                        <Text style={styles.leaveIcon}>🚪</Text>
                        <Text style={styles.leaveText}>Salir del grupo</Text>
                        <Text style={styles.leaveArrow}>›</Text>
                    </Pressable>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── MODAL CÓDIGO DE INVITACIÓN ── */}
            <Modal visible={inviteVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Código de invitación</Text>
                        <Text style={styles.modalSub}>
                            Comparte este código con quien quieras invitar a <Text style={{ fontWeight: '700' }}>{group?.name}</Text>. Expira en 48 h.
                        </Text>

                        <Pressable onPress={handleCopyCode} style={styles.codeBox}>
                            <Text style={styles.codeText}>{inviteCode}</Text>
                            <Text style={styles.codeCopyHint}>Toca para copiar 📋</Text>
                        </Pressable>

                        <Pressable style={styles.waBtn} onPress={handleShareCode}>
                            <Text style={styles.waBtnIcon}>📤</Text>
                            <Text style={styles.waBtnText}>Compartir por WhatsApp / SMS</Text>
                        </Pressable>

                        <Button title="Cerrar" variant="ghost" fullWidth
                            onPress={() => setInviteVisible(false)}
                            style={{ marginTop: Spacing.sm }} />
                    </View>
                </View>
            </Modal>

            {/* ── MODAL EDITAR NOMBRE ── */}
            <Modal visible={editVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { borderRadius: Radius.xl }]}>
                        <Text style={styles.modalTitle}>Editar nombre del grupo</Text>
                        <TextInput
                            style={styles.nameInput}
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
    content: { paddingBottom: Spacing.xxxl },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    errorText: { ...Typography.body, color: Colors.danger },

    // ── HEADER ──
    header: {
        paddingHorizontal: Spacing.xl, paddingTop: 52,
        paddingBottom: Spacing.xxl, position: 'relative', overflow: 'hidden',
    },
    headerBg: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#1C1917',
        borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    },
    headerCircle: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        opacity: 0.1, top: -50, right: -30,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.xl,
    },
    backIcon: { fontSize: 18, color: '#fff', fontWeight: '700' },
    groupHero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    groupAvatarBox: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    groupAvatarEmoji: { fontSize: 34 },
    groupHeroInfo: { flex: 1 },
    groupHeroName: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
    groupHeroSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
    editGroupBtn: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },
    editGroupBtnText: { fontSize: 18 },

    // ── ACCIONES ──
    actionsGrid: {
        flexDirection: 'row', gap: Spacing.md,
        marginHorizontal: Spacing.xl, marginTop: Spacing.lg,
    },
    actionBig: {
        flex: 1, borderRadius: Radius.xl, borderWidth: 1.5,
        padding: Spacing.lg, alignItems: 'center', gap: 4,
        ...Shadows.card,
    },
    actionBigEmoji: { fontSize: 32, marginBottom: 4 },
    actionBigTitle: { fontSize: 15, fontWeight: '800' },
    actionBigSub: { fontSize: 12, fontWeight: '500' },

    secondaryGrid: {
        flexDirection: 'row', gap: Spacing.sm,
        marginHorizontal: Spacing.xl, marginTop: Spacing.sm,
    },
    secondaryCard: {
        flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.xl,
        padding: Spacing.md, alignItems: 'center', gap: 3,
        borderWidth: 1, borderColor: Colors.border, ...Shadows.card,
    },
    secondaryEmoji: { fontSize: 26 },
    secondaryTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
    secondarySub: { fontSize: 11, color: Colors.textMuted },

    // ── SECTION ──
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginHorizontal: Spacing.xl, marginTop: Spacing.xxl, marginBottom: Spacing.md,
    },
    sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: Colors.textMuted },
    sectionCount: { fontSize: 13, fontWeight: '700', color: Colors.primary },

    // ── MIEMBROS ──
    memberList: { marginHorizontal: Spacing.xl, gap: Spacing.sm },
    memberRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: Colors.surface, borderRadius: Radius.xl,
        padding: Spacing.md, ...Shadows.card,
        borderWidth: 1, borderColor: Colors.border,
    },
    memberRowMe: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
    memberAvatar: {
        width: 46, height: 46, borderRadius: 15,
        alignItems: 'center', justifyContent: 'center',
    },
    memberInitial: { fontSize: 18, fontWeight: '800', color: '#fff' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '700', color: Colors.text },
    memberRole: { fontSize: 12, color: Colors.textSoft, marginTop: 2 },
    meChip: {
        backgroundColor: Colors.primary, borderRadius: Radius.pill,
        paddingHorizontal: 10, paddingVertical: 4,
    },
    meChipText: { fontSize: 11, fontWeight: '800', color: '#fff' },

    // ── ZONA PELIGROSA ──
    dangerZone: {
        marginHorizontal: Spacing.xl, marginTop: Spacing.xxl,
        backgroundColor: '#FFF1F2', borderRadius: Radius.xl,
        padding: Spacing.lg, borderWidth: 1.5, borderColor: '#FFD5D5',
    },
    dangerLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: Colors.danger, marginBottom: Spacing.md },
    leaveBtn: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    },
    leaveIcon: { fontSize: 20 },
    leaveText: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.danger },
    leaveArrow: { fontSize: 22, color: Colors.danger },

    // ── MODALES ──
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: Spacing.xl, paddingBottom: 36,
    },
    modalHandle: {
        width: 40, height: 4, backgroundColor: Colors.border,
        borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
    },
    modalTitle: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
    modalSub: { ...Typography.body, color: Colors.textSoft, textAlign: 'center', marginBottom: Spacing.xl },
    codeBox: {
        backgroundColor: '#F5F3FF', borderRadius: Radius.xl,
        padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg,
        borderWidth: 2.5, borderColor: '#8B5CF6', borderStyle: 'dashed',
    },
    codeText: { fontSize: 40, fontWeight: '900', color: '#6D28D9', letterSpacing: 8 },
    codeCopyHint: { fontSize: 12, color: '#7C3AED', marginTop: 8 },
    waBtn: {
        backgroundColor: '#25D366', borderRadius: Radius.lg,
        paddingVertical: 14, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    waBtnIcon: { fontSize: 18 },
    waBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    nameInput: {
        backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
        borderRadius: Radius.lg, padding: Spacing.lg,
        fontSize: 16, color: Colors.text, marginBottom: Spacing.lg,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
});
