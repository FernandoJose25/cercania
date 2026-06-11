// 📁 cercania/app-scaffold/src/components/ui/ReviewModal.tsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { submitReview, dismissReview } from '../../services/review.service';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ReviewModal({ visible, onClose }: Props) {
  const [rating, setRating]   = useState<0|1|2|3|4|5>(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setLoading(true);
    try {
      await submitReview({ rating: rating as 1|2|3|4|5, comment: comment.trim() || undefined });
      setDone(true);
      setTimeout(onClose, 1800);
    } catch {
      // fallo silencioso — no bloquear al usuario
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss() {
    await dismissReview();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <View style={s.sheet}>
          {done ? (
            <View style={s.doneWrap}>
              <Text style={s.doneEmoji}>🎉</Text>
              <Text style={s.doneTitle}>¡Gracias por tu opinión!</Text>
              <Text style={s.doneSub}>Tu reseña ayuda a mejorar Cercanía.</Text>
            </View>
          ) : (
            <>
              <View style={s.handle} />
              <Text style={s.title}>¿Cómo va Cercanía?</Text>
              <Text style={s.sub}>Tu opinión nos ayuda a mejorar la app para toda tu familia.</Text>

              <View style={s.stars}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity key={n} onPress={() => setRating(n as any)} style={s.starBtn}>
                    <Text style={[s.star, n <= rating && s.starActive]}>{n <= rating ? '★' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {rating > 0 && (
                <TextInput
                  style={s.input}
                  placeholder="Cuéntanos más (opcional)..."
                  placeholderTextColor="#9CA3AF"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  maxLength={500}
                />
              )}

              <TouchableOpacity
                style={[s.btnPrimary, rating === 0 && s.btnDisabled]}
                onPress={handleSubmit}
                disabled={rating === 0 || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>Enviar opinión</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={s.btnSkip} onPress={handleDismiss}>
                <Text style={s.btnSkipText}>Ahora no</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40, alignItems: 'center',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  starBtn: { padding: 4 },
  star: { fontSize: 40, color: '#D1D5DB' },
  starActive: { color: '#F59E0B' },
  input: {
    width: '100%', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    padding: 14, fontSize: 15, color: '#1F2937', minHeight: 90, textAlignVertical: 'top',
    marginBottom: 20,
  },
  btnPrimary: {
    backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 15,
    width: '100%', alignItems: 'center', marginBottom: 10,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnSkip: { paddingVertical: 10 },
  btnSkipText: { color: '#9CA3AF', fontSize: 14 },
  doneWrap: { alignItems: 'center', paddingVertical: 32 },
  doneEmoji: { fontSize: 52, marginBottom: 16 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
  doneSub: { fontSize: 15, color: '#6B7280' },
});
