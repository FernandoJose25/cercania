// 📁 cercania/app-scaffold/src/store/groups.ts
import { create } from 'zustand';
import { getSupabase } from '../lib/supabase';
import { Group, GroupMember } from '../types/index';

interface GroupsState {
  groups: Group[];
  loading: boolean;
  error: string | null;
  loadGroups: () => Promise<void>;
  createGroup: (name: string, emoji: string, color: string) => Promise<{ group_id: string; invite_code: string }>;
  joinGroup: (code: string) => Promise<{ group_id: string }>;
  leaveGroup: (groupId: string) => Promise<void>;
}

export const useGroups = create<GroupsState>((set) => ({
  groups: [],
  loading: false,
  error: null,

  loadGroups: async () => {
    set({ loading: true, error: null });
    try {
      const sb = await getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { data, error } = await sb
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      const groups = (data ?? [])
        .map((row: any) => row.groups)
        .filter(Boolean) as Group[];

      set({ groups, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createGroup: async (name, emoji, color) => {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc('create_group_with_invite', {
      p_name: name,
      p_emoji: emoji,
      p_color: color
    });
    if (error) throw error;
    await useGroups.getState().loadGroups();
    return data as { group_id: string; invite_code: string };
  },

  joinGroup: async (code) => {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc('join_group_with_code', {
      p_code: code.toUpperCase().trim()
    });
    if (error) throw error;
    await useGroups.getState().loadGroups();
    return data as { group_id: string };
  },

  leaveGroup: async (groupId) => {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { error } = await sb
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);
    if (error) throw error;
    await useGroups.getState().loadGroups();
  }
}));
