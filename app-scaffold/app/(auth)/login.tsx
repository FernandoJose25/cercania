// 📁 cercania/app-scaffold/app/(auth)/login.tsx
// Redirige a welcome — el flujo de auth ahora es solo Google desde welcome.tsx
import { Redirect } from 'expo-router';

export default function LoginScreen() {
  return <Redirect href="/(auth)/welcome" />;
}
