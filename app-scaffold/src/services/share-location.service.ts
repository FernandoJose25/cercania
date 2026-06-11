// 📁 cercania/app-scaffold/src/services/share-location.service.ts
/**
 * Link temporal de ubicación para compartir con personas fuera del grupo.
 * El link expira en el tiempo configurado (15 min, 1h, 4h, 24h).
 */
import { getSupabase } from '../lib/supabase';

export type ShareDuration = '15min' | '1h' | '4h' | '24h';

const DURATION_MS: Record<ShareDuration, number> = {
  '15min': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

const DURATION_LABELS: Record<ShareDuration, string> = {
  '15min': '15 minutos',
  '1h': '1 hora',
  '4h': '4 horas',
  '24h': '24 horas',
};

export interface ShareLink {
  id: string;
  token: string;
  url: string;
  expiresAt: string;
  duration: ShareDuration;
  label: string;
}

export async function createShareLink(duration: ShareDuration): Promise<ShareLink> {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const expiresAt = new Date(Date.now() + DURATION_MS[duration]).toISOString();

  const { data, error } = await sb
    .from('location_share_links')
    .insert({
      user_id: user.id,
      expires_at: expiresAt,
      is_active: true,
    })
    .select('id, token')
    .single();

  if (error) throw error;

  const url = `https://cercania.vercel.app/live/${data.token}`;

  return {
    id: data.id,
    token: data.token,
    url,
    expiresAt,
    duration,
    label: DURATION_LABELS[duration],
  };
}

export async function getActiveShareLinks(): Promise<ShareLink[]> {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const { data } = await sb
    .from('location_share_links')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return (data ?? []).map((row: any) => {
    const now = Date.now();
    const exp = new Date(row.expires_at).getTime();
    const diffMs = exp - now;
    let duration: ShareDuration = '1h';
    if (diffMs <= 15 * 60 * 1000) duration = '15min';
    else if (diffMs <= 60 * 60 * 1000) duration = '1h';
    else if (diffMs <= 4 * 60 * 60 * 1000) duration = '4h';
    else duration = '24h';

    return {
      id: row.id,
      token: row.token,
      url: `https://cercania.vercel.app/live/${row.token}`,
      expiresAt: row.expires_at,
      duration,
      label: DURATION_LABELS[duration],
    };
  });
}

export async function revokeShareLink(id: string): Promise<void> {
  const sb = await getSupabase();
  await sb.from('location_share_links').update({ is_active: false }).eq('id', id);
}

export function formatExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Expira en ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `Expira en ${hrs}h ${mins % 60}min`;
}
