// 📁 cercania/app-scaffold/src/services/google-auth.service.ts
import {
    GoogleSignin,
    statusCodes
} from '@react-native-google-signin/google-signin';
import { getSupabase } from '../lib/supabase';

const WEB_CLIENT_ID = '1009559643118-0b49es9648h1vqgciefkpo2qm45k4ur2.apps.googleusercontent.com';

export function configureGoogleSignIn() {
    GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        scopes: ['profile', 'email'],
        // CRÍTICO: forceCodeForRefreshToken evita que recuerde la cuenta
        // El usuario SIEMPRE verá el selector de cuentas
        forceCodeForRefreshToken: true,
    });
}

export async function signInWithGoogle() {
    // SIEMPRE cerrar sesión de Google antes de mostrar el selector
    // Esto fuerza que aparezca la lista de cuentas cada vez
    try {
        await GoogleSignin.signOut();
    } catch (_) { }

    // Revocar acceso también limpia el estado de selección
    try {
        await GoogleSignin.revokeAccess();
    } catch (_) { }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Ahora sí mostrar el selector — siempre mostrará todas las cuentas
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();

    if (!idToken) throw new Error('No se pudo obtener el token de Google');

    const sb = await getSupabase();
    const { data, error } = await sb.auth.signInWithIdToken({
        provider: 'google',
        token: idToken
    });

    if (error) throw error;
    return data;
}

export async function signOutGoogle() {
    try {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
    } catch (_) { }
}