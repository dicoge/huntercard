import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS } from '../../constants';

interface TutorialImageViewProps {
  uri: string;
  alt: string;
}

export default function TutorialImageView({ uri, alt }: TutorialImageViewProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  // Image category icons
  const getEmoji = () => {
    if (alt.includes('主推')) return '⭐';
    if (alt.includes('成員')) return '👤';
    if (alt.includes('支援')) return '🛠️';
    if (alt.includes('吶喊')) return '📣';
    if (alt.includes('場地')) return '🏟️';
    if (alt.includes('狀態')) return '🔄';
    return '🃏';
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageFrame}>
        {/* Remote image */}
        {!loadFailed && (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            onError={() => setLoadFailed(true)}
          />
        )}
        {/* Fallback overlay */}
        {loadFailed && (
          <View style={styles.fallback}>
            <Text style={styles.fallbackEmoji}>{getEmoji()}</Text>
            <Text style={styles.fallbackText}>{alt}</Text>
          </View>
        )}
      </View>
      <Text style={styles.caption}>{alt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  imageFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#1a1a30',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  fallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e3a',
  },
  fallbackEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  fallbackText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  caption: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    opacity: 0.7,
  },
});