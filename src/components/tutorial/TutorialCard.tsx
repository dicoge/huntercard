import React from 'react';
import { View, StyleSheet, ViewStyle, useWindowDimensions } from 'react-native';
import { COLORS } from '../../constants';

interface TutorialCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: boolean;
}

export default function TutorialCard({ children, style, accent = false }: TutorialCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 480;

  return (
    <View
      style={[
        styles.card,
        isMobile && styles.cardMobile,
        accent && styles.cardAccent,
        style,
      ]}
    >
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
  cardMobile: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardAccent: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
});
