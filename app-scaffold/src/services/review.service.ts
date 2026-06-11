// 📁 cercania/app-scaffold/src/services/review.service.ts
import { getSupabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEW_ASKED_KEY = 'review_asked';
const INSTALL_DATE_KEY = 'install_date';
const DAYS_BEFORE_ASK  = 3;

export interface ReviewInput {
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

export async function submitReview(input: ReviewInput): Promise<void> {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await sb
    .from('reviews')
    .upsert({ user_id: user.id, rating: input.rating, comment: input.comment ?? null });
  if (error) throw error;

  await AsyncStorage.setItem(REVIEW_ASKED_KEY, 'true');
}

// Marca la fecha de instalación la primera vez que se llama
export async function markInstallDate(): Promise<void> {
  const existing = await AsyncStorage.getItem(INSTALL_DATE_KEY);
  if (!existing) {
    await AsyncStorage.setItem(INSTALL_DATE_KEY, new Date().toISOString());
  }
}

// Devuelve true si han pasado DAYS_BEFORE_ASK días y el usuario aún no ha calificado
export async function shouldAskForReview(): Promise<boolean> {
  const asked = await AsyncStorage.getItem(REVIEW_ASKED_KEY);
  if (asked) return false;

  const installDate = await AsyncStorage.getItem(INSTALL_DATE_KEY);
  if (!installDate) return false;

  const days = (Date.now() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24);
  return days >= DAYS_BEFORE_ASK;
}

export async function dismissReview(): Promise<void> {
  await AsyncStorage.setItem(REVIEW_ASKED_KEY, 'true');
}
