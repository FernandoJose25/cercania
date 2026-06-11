// 📁 cercania/app-scaffold/src/services/auth.service.ts
/**
 * Servicio de autenticación.
 *
 * Modelo:
 *  - Email + Contraseña como método principal.
 *  - OTP por email solo para verificar identidad en momentos clave:
 *      * confirmación de cuenta tras el registro
 *      * recuperación de contraseña
 *      * (futuro) login desde dispositivo nuevo
 *  - "Mantener sesión 30 días" controla si los tokens se persisten en
 *    almacenamiento seguro o solo en memoria.
 */

import { getSupabase, rebuildSupabase } from '@/lib/supabase';
import { setStorageMode } from '@/lib/secureStorage';

// ---------------------------------------------------------------------
// REGISTRO
// ---------------------------------------------------------------------
export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

/**
 * Crea la cuenta. Supabase enviará un OTP de 6 dígitos al email
 * (Auth > Email Templates > "Confirm signup" debe estar configurado
 * para enviar el token, no un link).
 */
export async function signUp({ email, password, displayName }: SignUpInput) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { display_name: displayName.trim() }
    }
  });
  if (error) throw error;
  return data;
}

/** Verifica el OTP de 6 dígitos enviado al email */
export async function verifySignupOtp(email: string, token: string) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'signup'
  });
  if (error) throw error;
  return data;
}

/** Reenvía el OTP de registro (rate limited del lado de Supabase) */
export async function resendSignupOtp(email: string) {
  const sb = await getSupabase();
  const { error } = await sb.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase()
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------
export interface SignInInput {
  email: string;
  password: string;
  keepSession: boolean;
}

/**
 * Inicia sesión con email + contraseña.
 * keepSession=true → persiste en Keychain/EncryptedSharedPrefs (30 días)
 * keepSession=false → solo en memoria (se pierde al cerrar la app)
 */
export async function signIn({ email, password, keepSession }: SignInInput) {
  // Importante: setear el modo ANTES de crear el cliente.
  await setStorageMode(keepSession);
  await rebuildSupabase();

  const sb = await getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// RECUPERAR CONTRASEÑA (email OTP)
// ---------------------------------------------------------------------
export async function requestPasswordReset(email: string) {
  const sb = await getSupabase();
  const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) throw error;
}

/**
 * Verifica el OTP del email de recuperación.
 * Si tiene éxito, deja una sesión temporal que permite cambiar la
 * contraseña con updateUser({ password }).
 */
export async function verifyRecoveryOtp(email: string, token: string) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'recovery'
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const sb = await getSupabase();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------
export async function signOut() {
  const sb = await getSupabase();
  await sb.auth.signOut();
}

// ---------------------------------------------------------------------
// SESIÓN ACTUAL
// ---------------------------------------------------------------------
export async function getCurrentSession() {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  return data.session;
}
