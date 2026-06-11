// 📁 cercania/app-scaffold/src/components/ui/UpdateModal.tsx
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  Linking, StyleSheet, BackHandler
} from 'react-native';
import { RemoteVersion } from '../../services/update.service';

interface Props {
  visible: boolean;
  info: RemoteVersion;
  onDismiss: () => void;
}

export function UpdateModal({ visible, info, onDismiss }: Props) {
  // Bloquear botón físico "atrás" en updates obligatorios
  React.useEffect(() => {
    if (!visible || !info.mandatory) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible, info.mandatory]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.emoji}>🚀</Text>
          <Text style={s.title}>Nueva versión disponible</Text>
          <Text style={s.version}>v{info.version}</Text>
          <Text style={s.message}>{info.message}</Text>

          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => Linking.openURL(info.url)}
          >
            <Text style={s.btnPrimaryText}>Descargar actualización</Text>
          </TouchableOpacity>

          {!info.mandatory && (
            <TouchableOpacity style={s.btnSecondary} onPress={onDismiss}>
              <Text style={s.btnSecondaryText}>Ahora no</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  version: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  message: { fontSize: 15, color: '#374151', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  btnPrimary: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnSecondary: { paddingVertical: 10 },
  btnSecondaryText: { color: '#9CA3AF', fontSize: 14 },
});
