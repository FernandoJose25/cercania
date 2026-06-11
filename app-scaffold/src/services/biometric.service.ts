// 📁 cercania/app-scaffold/src/services/biometric.service.ts
/**
 * Servicio de biometría.
 *
 * Usa expo-local-authentication para Face ID, Touch ID y huella.
 * El "biometric gate" es la pantalla que bloquea la app al abrirla
 * cuando el usuario activó esta protección.
 */

import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricCapabilities {
  available: boolean;       // hardware disponible
  enrolled: boolean;        // el usuario tiene huella/face registrada en el SO
  types: string[];          // ['fingerprint', 'face', 'iris']
}

export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  const [hasHardware, enrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync()
  ]);

  const typeNames = types.map(t => {
    switch (t) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT: return 'fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION: return 'face';
      case LocalAuthentication.AuthenticationType.IRIS: return 'iris';
      default: return 'unknown';
    }
  });

  return { available: hasHardware, enrolled, types: typeNames };
}

export interface AuthenticatePrompt {
  reason?: string;
  fallbackLabel?: string;
  cancelLabel?: string;
}

/**
 * Solicita autenticación biométrica.
 * Devuelve true si fue exitosa, false si el usuario canceló o falló.
 * Lanza error si el hardware no está disponible o no hay enrolamiento.
 */
export async function authenticateBiometric(opts: AuthenticatePrompt = {}): Promise<boolean> {
  const caps = await getBiometricCapabilities();
  if (!caps.available) throw new Error('Este dispositivo no soporta biometría');
  if (!caps.enrolled) throw new Error('No hay huella o rostro configurado en este dispositivo');

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: opts.reason ?? 'Confirma tu identidad',
    cancelLabel: opts.cancelLabel ?? 'Cancelar',
    fallbackLabel: opts.fallbackLabel ?? 'Usar contraseña del dispositivo',
    disableDeviceFallback: false // permite PIN del SO como respaldo
  });

  return result.success;
}

/** Para acciones críticas, NO permitir fallback al PIN del dispositivo */
export async function authenticateStrict(reason: string): Promise<boolean> {
  const caps = await getBiometricCapabilities();
  if (!caps.available || !caps.enrolled) {
    throw new Error('Acción requiere biometría no disponible en este dispositivo');
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    disableDeviceFallback: true,
    cancelLabel: 'Cancelar'
  });
  return result.success;
}
