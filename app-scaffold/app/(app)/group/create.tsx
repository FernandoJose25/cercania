// 📁 cercania/app-scaffold/app/(app)/group/create.tsx
import React, { useState } from 'react';
import {
    Alert,
    Clipboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../../src/components/ui/Button';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../../src/lib/theme';
import { useGroups } from '../../../src/store/groups';

const EMOJIS = ['👨‍👩‍👧‍👦', '👪', '🏠', '❤️', '⭐', '🌟', '🦁', '🐻', '🌺', '🎯'];
const COLORS = ['#F59E0B', '#EC4899', '#8B5CF6', '#10B981', '#3B82F6', '#F97316', '#EF4444', '#06B6D4'];

export default function CreateGroupScreen() {
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('👨‍👩‍👧‍👦');
    const [color, setColor] = useState('#F59E0B');
    const [loading, setLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState(null);
    const [copied, setCopied] = useState(false);
    const { createGroup } = useGroups();

    const handleCreate = async () => {
        if (!name.trim()) { Alert.alert('Escribe un nombre para el grupo'); return; }
        setLoading(true);
        try {
            const result = await createGroup(name.trim(), emoji, color);
            setInviteCode(result.invite_code);
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!inviteCode) return;
        Clipboard.setString(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
                    <Text style={styles.backText}>← Volver</Text>
                </Pressable>
                <Text style={styles.title}>Crear grupo familiar</Text>
                <Text style={styles.subtitle}>Dale un nombre y personalízalo.</Text>
                <View style={styles.previewCard}>
                    <View style={[styles.previewEmoji, { backgroundColor: color + '22' }]}>
                        <Text style={styles.previewEmojiText}>{emoji}</Text>
                    </View>
                    <Text style={[styles.previewName, !name && { color: Colors.textMuted }]}>
                        {name || 'Nombre del grupo'}
                    </Text>
                </View>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. Familia Garcia"
                    placeholderTextColor={Colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    maxLength={40}
                />
                <Text style={styles.label}>Emoji</Text>
                <View style={styles.row}>
                    {EMOJIS.map(e => (
                        <Pressable key={e} style={[styles.emojiOption, emoji === e && styles.emojiSelected]} onPress={() => setEmoji(e)}>
                            <Text style={styles.emojiText}>{e}</Text>
                        </Pressable>
                    ))}
                </View>
                <Text style={styles.label}>Color</Text>
                <View style={styles.row}>
                    {COLORS.map(c => (
                        <Pressable key={c} style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorSelected]} onPress={() => setColor(c)} />
                    ))}
                </View>
                <Button title="Crear grupo" variant="primary" size="lg" fullWidth loading={loading} onPress={handleCreate} style={{ marginTop: Spacing.xl }} />
            </ScrollView>

            <Modal visible={!!inviteCode} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalEmoji}>{emoji}</Text>
                        <Text style={styles.modalTitle}>Grupo creado</Text>
                        <Text style={styles.modalSubtitle}>Comparte este codigo con tu familia:</Text>
                        <View style={styles.codeBox}>
                            <Text style={styles.codeText}>{inviteCode}</Text>
                        </View>
                        <Text style={styles.codeHint}>Expira en 48 horas</Text>
                        <Pressable style={[styles.copyBtn, copied && styles.copyBtnDone]} onPress={handleCopy}>
                            <Text style={styles.copyBtnText}>{copied ? 'Copiado' : 'Copiar codigo'}</Text>
                        </Pressable>
                        <Button title="Ir al inicio" variant="primary" size="lg" fullWidth onPress={() => router.replace('/(app)/home')} style={{ marginTop: Spacing.sm }} />
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
    subtitle: { ...Typography.body, color: Colors.textSoft, marginTop: Spacing.xs, marginBottom: Spacing.xl },
    previewCard: { alignItems: 'center', marginBottom: Spacing.xl, gap: Spacing.md },
    previewEmoji: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    previewEmojiText: { fontSize: 44 },
    previewName: { ...Typography.h2, color: Colors.text },
    label: { ...Typography.bodyBold, color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.md },
    input: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.lg, ...Typography.body, color: Colors.text },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    emojiOption: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt },
    emojiSelected: { borderWidth: 2.5, borderColor: Colors.primary },
    emojiText: { fontSize: 26 },
    colorOption: { width: 40, height: 40, borderRadius: 20 },
    colorSelected: { borderWidth: 3, borderColor: Colors.text },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    modal: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', alignItems: 'center' },
    modalEmoji: { fontSize: 56, marginBottom: Spacing.md },
    modalTitle: { ...Typography.h1, color: Colors.text, marginBottom: Spacing.xs },
    modalSubtitle: { ...Typography.body, color: Colors.textSoft, textAlign: 'center', marginBottom: Spacing.lg },
    codeBox: { backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderWidth: 2, borderColor: Colors.primary, marginBottom: Spacing.xs, width: '100%', alignItems: 'center' },
    codeText: { fontSize: 36, fontWeight: '800', color: Colors.primaryDark, letterSpacing: 10 },
    codeHint: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.lg },
    copyBtn: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, width: '100%', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing.sm },
    copyBtnDone: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
    copyBtnText: { ...Typography.bodyBold, color: Colors.text }
});