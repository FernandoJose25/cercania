import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGroups } from '../../../src/store/groups';
import { Colors, Radius, Spacing, Typography } from '../../../src/lib/theme';
import { getInitials } from '../../../src/utils/format';

const GROUP_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F97316'];

export default function GroupsTabScreen() {
  const { groups, loading, loadGroups } = useGroups();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mis grupos</Text>
          <Text style={styles.headerSub}>
            {groups.length === 0 ? 'Aún no tienes grupos' : `${groups.length} grupo${groups.length !== 1 ? 's' : ''} activo${groups.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push('/(app)/group/create')}
        >
          <Ionicons name="add" size={22} color="#1C1917" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {loading && groups.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people-outline" size={48} color="#78716C" />
            </View>
            <Text style={styles.emptyTitle}>Sin grupos todavía</Text>
            <Text style={styles.emptyText}>
              Crea un grupo familiar o únete con un código de invitación.
            </Text>
            <View style={styles.emptyActions}>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => router.push('/(app)/group/create')}
              >
                <Ionicons name="add-circle-outline" size={18} color="#1C1917" />
                <Text style={styles.primaryBtnText}>Crear grupo</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => router.push('/(app)/group/join')}
              >
                <Ionicons name="enter-outline" size={18} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>Unirme con código</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {groups.map((group, i) => {
              const color = group.color || GROUP_COLORS[i % GROUP_COLORS.length];
              return (
                <Pressable
                  key={group.id}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() => router.push(`/(app)/group/${group.id}` as any)}
                >
                  <View style={[styles.cardAvatar, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.cardAvatarText, { color }]}>
                      {group.emoji || getInitials(group.name)}
                    </Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardName}>{group.name}</Text>
                    <Text style={styles.cardSub}>Toca para ver detalles</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable
                      style={[styles.mapBtn, { borderColor: color }]}
                      onPress={() => router.push(`/(app)/map/${group.id}` as any)}
                      hitSlop={8}
                    >
                      <Ionicons name="map-outline" size={16} color={color} />
                    </Pressable>
                    <Ionicons name="chevron-forward" size={18} color="#57534E" />
                  </View>
                </Pressable>
              );
            })}

            {/* Acción secundaria al final */}
            <Pressable
              style={styles.joinRow}
              onPress={() => router.push('/(app)/group/join')}
            >
              <Ionicons name="enter-outline" size={18} color={Colors.primary} />
              <Text style={styles.joinRowText}>Unirme a otro grupo con código</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A09',
  },
  header: {
    backgroundColor: '#1C1917',
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#292524',
  },
  headerTitle: {
    ...Typography.h2,
    color: '#FAFAF9',
    marginBottom: 2,
  },
  headerSub: {
    ...Typography.caption,
    color: '#78716C',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: 12,
    paddingBottom: 32,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1C1917',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    ...Typography.h3,
    color: '#FAFAF9',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: '#78716C',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  emptyActions: {
    gap: 12,
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#1C1917',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: Radius.pill,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 16,
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
  cardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    ...Typography.bodyBold,
    color: '#FAFAF9',
    marginBottom: 2,
  },
  cardSub: {
    ...Typography.caption,
    color: '#57534E',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.lg,
    marginTop: 8,
  },
  joinRowText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
});
