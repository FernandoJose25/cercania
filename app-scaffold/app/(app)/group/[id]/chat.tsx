import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Linking,
  Platform, Pressable, StyleSheet, Text, TextInput, View
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Typography } from '../../../../src/lib/theme';
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
  { text: 'Ya llegué ✅', emoji: '✅' },
  { text: 'Salgo en 10 min', emoji: '🚶' },
  { text: 'Estoy en camino 🚗', emoji: '🚗' },
  { text: 'Me demoraré un poco ⏰', emoji: '⏰' },
  { text: 'Llámame 📞', emoji: '📞' },
  { text: 'Llegaré pronto 🏠', emoji: '🏠' },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function openLocationInMaps(lat: number, lng: number, name: string) {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.openURL(url).catch(() => {});
}

function MessageBubble({ msg, isOwn, showAvatar }: { msg: ChatMessage; isOwn: boolean; showAvatar: boolean }) {
  const isLocation = msg.type === 'location' || msg.type === 'checkin';
  const hasCoords = msg.latitude != null && msg.longitude != null;

  return (
    <View style={[bs.row, isOwn && bs.rowOwn]}>
      {/* Avatar del otro */}
      {!isOwn && (
        <View style={bs.avatarSlot}>
          {showAvatar ? (
            <View style={bs.avatar}>
              <Text style={bs.avatarText}>{getInitials(msg.display_name)}</Text>
            </View>
          ) : (
            <View style={bs.avatarPlaceholder} />
          )}
        </View>
      )}

      <View style={[bs.bubbleWrap, isOwn && bs.bubbleWrapOwn]}>
        {!isOwn && showAvatar && (
          <Text style={bs.senderName}>{msg.display_name}</Text>
        )}

        {isLocation && hasCoords ? (
          /* Mensaje de ubicación con mapa estático */
          <Pressable
            style={[bs.bubble, bs.locationBubble, isOwn && bs.locationBubbleOwn]}
            onPress={() => openLocationInMaps(msg.latitude!, msg.longitude!, msg.display_name)}
          >
            <View style={bs.locationHeader}>
              <View style={[bs.locationIconWrap, isOwn && bs.locationIconWrapOwn]}>
                <Ionicons name="location" size={18} color={isOwn ? '#F59E0B' : '#F59E0B'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[bs.locationTitle, isOwn && bs.locationTitleOwn]}>
                  {msg.type === 'checkin' ? 'Check-in' : 'Ubicación compartida'}
                </Text>
                <Text style={[bs.locationCoords, isOwn && bs.locationCoordsOwn]}>
                  {msg.latitude!.toFixed(4)}, {msg.longitude!.toFixed(4)}
                </Text>
              </View>
            </View>
            {/* Miniatura estática del mapa via Static Maps */}
            <View style={bs.mapPreview}>
              <View style={bs.mapPlaceholder}>
                <Ionicons name="map" size={28} color="#F59E0B" />
                <Text style={bs.mapOpenText}>Toca para abrir en Maps</Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={[bs.bubble, isOwn ? bs.bubbleOwn : bs.bubbleOther]}>
            <Text style={[bs.text, isOwn && bs.textOwn]}>{msg.content}</Text>
          </View>
        )}

        <Text style={[bs.time, isOwn && bs.timeOwn]}>{formatTime(msg.created_at)}</Text>
      </View>
    </View>
  );
}

const bs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, paddingHorizontal: 12 },
  rowOwn: { flexDirection: 'row-reverse' },
  avatarSlot: { width: 32, marginRight: 6, alignSelf: 'flex-end' },
  avatarPlaceholder: { width: 32 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  bubbleWrap: { maxWidth: '72%', alignItems: 'flex-start' },
  bubbleWrapOwn: { alignItems: 'flex-end' },
  senderName: { fontSize: 11, fontWeight: '700', color: '#F59E0B', marginBottom: 3, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOther: { backgroundColor: '#292524', borderBottomLeftRadius: 4 },
  bubbleOwn: { backgroundColor: '#F59E0B', borderBottomRightRadius: 4 },
  text: { fontSize: 15, color: '#FAFAF9', lineHeight: 21 },
  textOwn: { color: '#1C1917' },
  time: { fontSize: 10, color: '#78716C', marginTop: 3, marginLeft: 4 },
  timeOwn: { textAlign: 'right', marginRight: 4 },

  // Location bubble
  locationBubble: {
    backgroundColor: '#1C1917', borderWidth: 1.5, borderColor: '#292524',
    borderRadius: 16, borderBottomLeftRadius: 4, padding: 0, overflow: 'hidden',
    minWidth: 220,
  },
  locationBubbleOwn: { borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  locationIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F59E0B22', alignItems: 'center', justifyContent: 'center',
  },
  locationIconWrapOwn: { backgroundColor: '#F59E0B33' },
  locationTitle: { fontSize: 13, fontWeight: '700', color: '#FAFAF9' },
  locationTitleOwn: { color: '#FAFAF9' },
  locationCoords: { fontSize: 10, color: '#78716C', marginTop: 1 },
  locationCoordsOwn: { color: '#A8A29E' },
  mapPreview: { width: '100%', height: 90, backgroundColor: '#0C0A09' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  mapOpenText: { fontSize: 11, color: '#78716C' },
});

// ─── Pantalla principal ────────────────────────────────────
export default function GroupChatScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('Chat');
  const [showQuick, setShowQuick] = useState(false);
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
    getSupabase().then(sb =>
      sb.from('groups').select('name').eq('id', groupId).single()
        .then(({ data }) => { if (data) setGroupName(data.name); })
    );

    let channel: any;
    getSupabase().then(sb => {
      channel = sb
        .channel(`group_chat_${groupId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public',
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

  const sendMessage = async (content: string, type: 'text' | 'location' = 'text', lat?: number, lng?: number) => {
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
        latitude: lat ?? null,
        longitude: lng ?? null,
      });
      setText('');
      setShowQuick(false);
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

      if (!loc) {
        await sendMessage('📍 Compartió su ubicación (sin datos GPS)');
        return;
      }

      const content = `${profile?.display_name ?? 'Alguien'} compartió su ubicación`;
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
    } catch {
      await sendMessage('📍 Compartió su ubicación');
    } finally {
      setSending(false);
    }
  };

  // Agrupación: si el mensaje anterior es del mismo usuario, no mostrar avatar
  const shouldShowAvatar = (index: number) => {
    if (index === 0) return true;
    return messages[index].user_id !== messages[index - 1].user_id;
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#FAFAF9" />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.groupAvatar}>
            <Ionicons name="people" size={18} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.headerTitle}>{groupName}</Text>
            <Text style={styles.headerSub}>Chat del grupo</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Mensajes */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <MessageBubble
              msg={item}
              isOwn={item.user_id === user?.id}
              showAvatar={shouldShowAvatar(index)}
            />
          )}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={44} color="#57534E" />
              </View>
              <Text style={styles.emptyTitle}>Sin mensajes aún</Text>
              <Text style={styles.emptyText}>Sé el primero en escribir algo al grupo</Text>
            </View>
          }
        />
      )}

      {/* Quick messages expandibles */}
      {showQuick && (
        <View style={styles.quickWrap}>
          <FlatList
            horizontal
            data={QUICK_MESSAGES}
            keyExtractor={item => item.text}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}
                onPress={() => sendMessage(item.text)}
              >
                <Text style={styles.quickEmoji}>{item.emoji}</Text>
                <Text style={styles.quickText}>{item.text}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* Barra de input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        {/* Botón rápidos */}
        <Pressable
          style={[styles.actionBtn, showQuick && styles.actionBtnActive]}
          onPress={() => setShowQuick(v => !v)}
          hitSlop={4}
        >
          <Ionicons name={showQuick ? 'close' : 'flash'} size={20} color={showQuick ? '#F59E0B' : '#78716C'} />
        </Pressable>

        {/* Botón ubicación */}
        <Pressable
          style={styles.actionBtn}
          onPress={sendLocationMessage}
          disabled={sending}
          hitSlop={4}
        >
          <Ionicons name="location-outline" size={20} color="#78716C" />
        </Pressable>

        {/* Input */}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#57534E"
          multiline
          maxLength={500}
        />

        {/* Enviar */}
        <Pressable
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(text)}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#1C1917" />
            : <Ionicons name="arrow-up" size={20} color="#1C1917" />
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C0A09' },

  header: {
    backgroundColor: '#1C1917',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#292524',
    gap: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F59E0B22', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FAFAF9' },
  headerSub: { fontSize: 11, color: '#78716C', marginTop: 1 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesList: { paddingVertical: 16, paddingBottom: 8 },

  emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1C1917', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FAFAF9', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#78716C', textAlign: 'center', lineHeight: 20 },

  quickWrap: {
    backgroundColor: '#1C1917',
    borderTopWidth: 1, borderTopColor: '#292524',
    paddingVertical: 8,
  },
  quickRow: { paddingHorizontal: 16, gap: 8 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#292524', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#3C3936',
  },
  quickEmoji: { fontSize: 14 },
  quickText: { fontSize: 13, fontWeight: '500', color: '#D6D3D1' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: 8, paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: '#1C1917',
    borderTopWidth: 1, borderTopColor: '#292524',
  },
  actionBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  actionBtnActive: { backgroundColor: '#F59E0B22', borderWidth: 1, borderColor: '#F59E0B' },
  input: {
    flex: 1, backgroundColor: '#292524',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#FAFAF9', maxHeight: 100,
    borderWidth: 1, borderColor: '#3C3936',
    marginBottom: 2,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: '#292524' },
});
