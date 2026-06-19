import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGroups } from '../../../src/store/groups';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../../src/lib/theme';
import { getInitials } from '../../../src/utils/format';

const GROUP_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F97316'];

export default function MapTabScreen() {
  const { groups, loading, loadGroups } = useGroups();

  useEffect(() => {
    loadGroups();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <Ionicons name="map-outline" size={48} color="#78716C" />
        </View>
        <Text style={styles.emptyTitle}>Sin grupos activos</Text>
        <Text style={styles.emptySubtitle}>Crea o únete a un grupo para ver el mapa</Text>
        <Pressable style={styles.emptyBtn} onPress={() => router.push('/(app)/group/create')}>
          <Text style={styles.emptyBtnText}>Crear grupo</Text>
        </Pressable>
      </View>
    );
  }

  if (groups.length === 1) {
    router.replace(`/(app)/map/${groups[0].id}` as any);
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Selecciona un grupo</Text>
        <Text style={styles.headerSub}>¿Qué familia quieres ver en el mapa?</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {groups.map((group, i) => {
          const color = group.color || GROUP_COLORS[i % GROUP_COLORS.length];
          return (
            <Pressable
              key={group.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/(app)/map/${group.id}` as any)}
            >
              <View style={[styles.cardIcon, { backgroundColor: color + '22' }]}>
                <Text style={[styles.cardIconText, { color }]}>
                  {getInitials(group.name)}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{group.name}</Text>
                <Text style={styles.cardSub}>Ver en el mapa</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#78716C" />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A09',
  },
  center: {
    flex: 1,
    backgroundColor: '#0C0A09',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    backgroundColor: '#1C1917',
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#292524',
  },
  headerTitle: {
    ...Typography.h2,
    color: '#FAFAF9',
    marginBottom: 4,
  },
  headerSub: {
    ...Typography.body,
    color: '#78716C',
  },
  list: {
    padding: Spacing.lg,
    gap: 12,
  },
  card: {
    backgroundColor: '#1C1917',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: '#292524',
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    ...Typography.bodyBold,
    color: '#FAFAF9',
    marginBottom: 2,
  },
  cardSub: {
    ...Typography.caption,
    color: '#78716C',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1C1917',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: '#FAFAF9',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.body,
    color: '#78716C',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  emptyBtnText: {
    color: '#1C1917',
    fontWeight: '700',
    fontSize: 15,
  },
});
