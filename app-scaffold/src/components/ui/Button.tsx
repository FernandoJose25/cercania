// 📁 cercania/app-scaffold/src/components/ui/Button.tsx
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle
} from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'lime' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  icon,
  style
}: ButtonProps) {

  const getContainerStyle = () => {
    const base: ViewStyle = {
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      ...getSizeStyle(),
    };

    if (fullWidth) base.alignSelf = 'stretch';
    if (disabled || loading) base.opacity = 0.6;

    return base;
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm': return { paddingHorizontal: 18, paddingVertical: 10, minHeight: 38 };
      case 'lg': return { paddingHorizontal: 36, paddingVertical: 17, minHeight: 56 };
      default: return { paddingHorizontal: 26, paddingVertical: 13, minHeight: 48 };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm': return { fontSize: 13, fontWeight: '700' as const };
      case 'lg': return { fontSize: 17, fontWeight: '800' as const, letterSpacing: 0.2 };
      default: return { fontSize: 15, fontWeight: '700' as const };
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: Colors.primary,
          ...Shadows.button,
        };
      case 'lime':
        return {
          backgroundColor: Colors.accent,
          ...Shadows.buttonLime,
        };
      case 'secondary':
        return {
          backgroundColor: Colors.surface,
          borderWidth: 2,
          borderColor: Colors.borderBlue,
          ...Shadows.card,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: Colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: Colors.danger,
          ...Shadows.button,
        };
      default: return {};
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'lime': return Colors.textOnLime;
      case 'secondary': return Colors.primary;
      case 'outline': return Colors.primary;
      case 'ghost': return Colors.textSoft;
      case 'danger': return '#fff';
      default: return '#fff';
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        getContainerStyle(),
        getVariantStyle(),
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon && <Text style={{ fontSize: size === 'lg' ? 20 : 16 }}>{icon}</Text>}
          <Text style={[{ color: getTextColor() }, getTextSize()]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}