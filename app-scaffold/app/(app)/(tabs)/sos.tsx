import { useEffect } from 'react';
import { router } from 'expo-router';

// Este archivo es necesario para Expo Router pero nunca se renderiza.
// El botón SOS del tab bar navega directamente a /(app)/sos-record.
export default function SOSTab() {
  useEffect(() => {
    router.replace('/(app)/sos-record');
  }, []);
  return null;
}
