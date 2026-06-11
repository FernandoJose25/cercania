// 📁 cercania/app-scaffold/app/(app)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
