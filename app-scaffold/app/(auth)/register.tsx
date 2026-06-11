// 📁 cercania/app-scaffold/app/(auth)/register.tsx
// Redirige a welcome — el flujo de registro ahora es solo Google desde welcome.tsx
import { Redirect } from 'expo-router';

export default function RegisterScreen() {
  return <Redirect href="/(auth)/welcome" />;
}
