import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../constants';

interface TutorialCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: boolean;
}

export default function TutorialCard({ children, style, accent = false }: TutorialCardProps) {
  return (
    <View style={[styles.card, accent && styles.cardAccent, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardAccent: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
});