// 📁 cercania/app-scaffold/src/utils/validation.ts
/**
 * Validaciones reutilizables (email, contraseñas, OTP, etc).
 * Sin dependencias externas. Mensajes en español.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ---------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------
export function validateEmail(email: string): ValidationResult {
  const clean = email.trim().toLowerCase();
  if (!clean) return { valid: false, error: 'Ingresa tu correo electrónico' };
  if (clean.length > 254) return { valid: false, error: 'Correo demasiado largo' };
  // Regex pragmática (RFC 5322 simplificado, suficiente en práctica)
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(clean)) return { valid: false, error: 'Correo no válido' };
  return { valid: true };
}

// ---------------------------------------------------------------------
// Contraseña: fortaleza progresiva
// ---------------------------------------------------------------------
export interface PasswordScore {
  score: 0 | 1 | 2 | 3 | 4; // 0=vacía, 4=muy fuerte
  label: string;
  hints: string[];
  valid: boolean;
}

export function scorePassword(password: string): PasswordScore {
  const hints: string[] = [];
  let score = 0;

  if (password.length === 0) {
    return { score: 0, label: '', hints: [], valid: false };
  }

  // Reglas mínimas
  if (password.length < 8) hints.push('Al menos 8 caracteres');
  else score++;

  if (!/[a-z]/.test(password)) hints.push('Una letra minúscula');
  else score++;

  if (!/[A-Z]/.test(password)) hints.push('Una letra mayúscula');
  else score++;

  if (!/[0-9]/.test(password)) hints.push('Un número');
  else score++;

  // Bonus por símbolo o longitud > 12 (no obligatorio)
  if (password.length >= 12 || /[^a-zA-Z0-9]/.test(password)) {
    score = Math.min(4, score + 1) as PasswordScore['score'];
  }

  // Penalizar contraseñas comunes
  const common = ['12345678', 'password', 'qwerty12', 'cercania', '11111111'];
  if (common.includes(password.toLowerCase())) {
    score = 1;
    hints.unshift('Esta contraseña es muy común');
  }

  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'];

  return {
    score: score as PasswordScore['score'],
    label: labels[score],
    hints,
    valid: score >= 3 && hints.length === 0
  };
}

export function validatePassword(password: string): ValidationResult {
  const s = scorePassword(password);
  if (!s.valid) {
    return { valid: false, error: s.hints[0] ?? 'Contraseña insegura' };
  }
  return { valid: true };
}

export function validatePasswordConfirm(password: string, confirm: string): ValidationResult {
  if (!confirm) return { valid: false, error: 'Confirma tu contraseña' };
  if (password !== confirm) return { valid: false, error: 'Las contraseñas no coinciden' };
  return { valid: true };
}

// ---------------------------------------------------------------------
// Nombre visible
// ---------------------------------------------------------------------
export function validateDisplayName(name: string): ValidationResult {
  const clean = name.trim();
  if (clean.length < 2) return { valid: false, error: 'Mínimo 2 caracteres' };
  if (clean.length > 50) return { valid: false, error: 'Máximo 50 caracteres' };
  return { valid: true };
}

// ---------------------------------------------------------------------
// OTP
// ---------------------------------------------------------------------
export function validateOtp(code: string): ValidationResult {
  if (!/^\d{6}$/.test(code)) return { valid: false, error: 'El código debe tener 6 dígitos' };
  return { valid: true };
}
