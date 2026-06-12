// 📁 cercania/app-scaffold/app/(app)/group/[id]/chat.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView,
  Platform, Pressable, StyleSheet, Text, TextInput, View
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../../../src/lib/theme';
import { getSupabase } from '../../../../src/lib/supabase';
import { useAuth } from '../../../../src/store/auth';
import { notifyChatMessage } from '../../../../src/services/notifications.service';

interface ChatMessage {
  id: string;
  user_id: string;
  display_name: string;
  content: string;
  type: 'text' | 'location' | 'checkin';
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

const QUICK_MESSAGES = [
  '📍 Salgo en 10 min',
  '✅ Ya llegué',
  '🚗 Estoy en camino',
  '⏰ Me demoraré un poco',
  '🏠 Llegaré pronto',
  '📞 Llámame',
];

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  const isLocation = msg.type === 'location' || msg.type === 'checkin';

  return (
    <View style={[bubbleStyles.wrap, isOwn && bubbleStyles.wrapOwn]}>
      {!isOwn && <Text style={bubbleStyles.sender}>{msg.display_name}</Text>}
      <View style={[
        bubbleStyles.bubble,
        isOwn ? bubbleStyles.bubbleOwn : bubbleStyles.bubbleOther,
        isLocation && bubbleStyles.bubbleLocation,
      ]}>
        {isLocation && (
          <Text style={bubbleStyles.locationIcon}>
            {msg.type === 'checkin' ? '✅' : '📍'}
          </Text>
        )}
        <Text style={[bubbleStyles.text, isOwn && bubbleStyles.textOwn]}>
          {msg.content}
        </Text>
        {msg.latitude != null && (
          <Text style={bubbleStyles.coords}>
            {msg.latitude.toFixed(5)}, {msg.longitude.toFixed(5)}
          </Text>
        )}
      </View>
      <Text style={[bubbleStyles.time, isOwn && bubbleStyles.timeOwn]}>
        {formatMessageTime(msg.created_at)}
      </Text>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  wrap: { marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, maxWidth: '80%', alignSelf: 'flex-start' },
  wrapOwn: { alignSelf: 'flex-end' },
  sender: { fontSize: 11, fontWeight: '700', color: Colors.primary, marginBottom: 3 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOther: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, ...Shadows.card },
  bubbleOwn: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleLocation: { borderWidth: 1.5, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationIcon: { fontSize: 20 },
  text: { ...Typography.body, color: Colors.text },
  textOwn: { color: '#fff' },
  coords: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  time: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  timeOwn: { textAlign: 'right' },
});

export default function GroupChatScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('Chat');
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    const sb = await getSupabase();
    const { data } = await sb
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages((data ?? []) as ChatMessage[]);
    setLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }, [groupId]);

  useEffect(() => {
    loadMessages();
    // Cargar nombre del grupo
    getSupabase().then(sb =>
      sb.from('groups').select('name').eq('id', groupId).single()
        .then(({ data }) => { if (data) setGroupName(data.name); })
    );

    // Suscripción realtime
    let channel: any;
    getSupabase().then(sb => {
      channel = sb
        .channel(`group_chat_${groupId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        })
        .subscribe();
    });
    return () => { channel?.unsubscribe(); };
  }, [groupId]);

  const sendMessage = async (content: string, type: 'text' | 'location' = 'text') => {
    if (!content.trim() || !user) return;
    setSending(true);
    try {
      const sb = await getSupabase();
      await sb.from('group_messages').insert({
        group_id: groupId,
        user_id: user.id,
        display_name: profile?.display_name ?? 'Tú',
        content: content.trim(),
        type,
        latitude: null,
        longitude: null,
      });
      setText('');
      // Notificar a los demás miembros del grupo
      notifyChatMessage(
        groupId as string,
        profile?.display_name ?? 'Alguien',
        user.id,
        content.trim()
      ).catch(() => {});
    } catch (e: any) {
      console.warn('[Chat]', e.message);
    } finally {
      setSending(false);
    }
  };

  const sendLocationMessage = async () => {
    setSending(true);
    try {
      const sb = await getSupabase();
      const { data: loc } = await sb
        .from('locations')
        .select('latitude, longitude')
        .eq('user_id', user?.id)
        .single();

      if (!loc) { await sendMessage('📍 Compartió su ubicación'); return; }

      const content = `📍 ${profile?.display_name ?? 'Alguien'} compartió su ubicación`;
      await sb.from('group_messages').insert({
        group_id: groupId,
        user_id: user?.id,
        display_name: profile?.display_name ?? 'Tú',
        content,
        type: 'location',
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      notifyChatMessage(
        groupId as string,
        profile?.display_name ?? 'Alguien',
        user!.id,
        content
      ).catch(() => {});
    } catch (e: any) {
      await sendMessage('📍 Compartió su ubicación');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBg} />
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>💬 {groupName}</Text>
          <Text style={styles.headerSub}>Chat del grupo</Text>
        </View>
      </View>

      {/* Mensajes */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageBubble msg={item} isOwn={item.user_id === user?.id} />
          )}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>Sin mensajes aún</Text>
              <Text style={styles.emptyText}>Sé el primero en escribir algo</Text>
            </View>
          }
        />
      )}

      {/* Mensajes rápidos */}
      <View style={styles.quickWrap}>
        <FlatList
          horizontal
          data={QUICK_MESSAGES}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
          renderItem={({ item }) => (
            <Pressable style={styles.quickChip} onPress={() => sendMessage(item)}>
              <Text style={styles.quickText}>{item}</Text>
            </Pressable>
          )}
        />
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <Pressable style={styles.locationBtn} onPress={sendLocationMessage} disabled={sending}>
          <Text style={styles.locationBtnText}>📍</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        <Pressable
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(text)}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.sendBtnText}>↑</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.xl, paddingTop: 52, paddingBottom: Spacing.lg, position: 'relative', overflow: 'hidden' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bgAlt, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm, ...Shadows.card },
  backIcon: { fontSize: 18, color: Colors.text, fontWeight: '700' },
  headerTitle: { ...Typography.h2, color: Colors.text },
  headerSub: { ...Typography.caption, color: Colors.textSoft },

  messagesList: { paddingTop: Spacing.md, paddingBottom: Spacing.md },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.text },
  emptyText: { ...Typography.body, color: Colors.textSoft, marginTop: 4 },

  quickWrap: { backgroundColor: Colors.surface, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  quickRow: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  quickChip: { backgroundColor: Colors.primaryLight, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primary },
  quickText: { fontSize: 12, fontWeight: '600', color: Colors.primaryDark },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.md },
  locationBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  locationBtnText: { fontSize: 20 },
  input: { flex: 1, backgroundColor: Colors.bgAlt, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, ...Typography.body, color: Colors.text, maxHeight: 100, borderWidth: 1.5, borderColor: Colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.button },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnText: { fontSize: 18, fontWeight: '900', color: '#fff' },
});
