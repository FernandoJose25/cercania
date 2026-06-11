// 📁 cercania/app-scaffold/src/services/auth.service.ts
import { getSupabase, rebuildSupabase } from '../lib/supabase';
import { setStorageMode } from '../lib/secureStorage';

export async function signUp({ email, password, displayName }) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { display_name: displayName.trim() } }
  });
  if (error) throw error;
  return data;
}

export async function verifySignupOtp(email, token) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.verifyOtp({
    email: email.trim().toLowerCase(), token: token.trim(), type: 'signup'
  });
  if (error) throw error;
  return data;
}

export async function resendSignupOtp(email) {
  const sb = await getSupabase();
  const { error } = await sb.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
  if (error) throw error;
}

export async function signIn({ email, password, keepSession }) {
  await setStorageMode(keepSession);
  // Solo reconstruir si cambia el modo de storage
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim().toLowerCase(), password
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const sb = await getSupabase();
  const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) throw error;
}

export async function verifyRecoveryOtp(email, token) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.verifyOtp({
    email: email.trim().toLowerCase(), token: token.trim(), type: 'recovery'
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword) {
  const sb = await getSupabase();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  const sb = await getSupabase();
  await sb.auth.signOut();
}

export async function getCurrentSession() {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  return data.session;
}