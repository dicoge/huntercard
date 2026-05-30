import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS } from '../../constants';

interface TutorialImageViewProps {
  uri: string;
  alt: string;
  screenWidth?: number;
}

export default function TutorialImageView({ uri, alt, screenWidth }: TutorialImageViewProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const isMobile = screenWidth !== undefined && screenWidth < 480;

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
      <View style={[styles.imageFrame, isMobile && styles.imageFrameMobile]}>
        {!loadFailed && (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            onError={() => setLoadFailed(true)}
          />
        )}
        {loadFailed && (
          <View style={styles.fallback}>
            <Text style={[styles.fallbackEmoji, isMobile && styles.fallbackEmojiMobile]}>
              {getEmoji()}
            </Text>
            <Text style={[styles.fallbackText, isMobile && styles.fallbackTextMobile]}>
              {alt}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.caption, isMobile && styles.captionMobile]}>{alt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
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
  imageFrameMobile: {
    borderRadius: 8,
    maxHeight: 200,
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
  fallbackEmojiMobile: {
    fontSize: 32,
    marginBottom: 6,
  },
  fallbackText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  fallbackTextMobile: {
    fontSize: 12,
  },
  caption: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    opacity: 0.7,
  },
  captionMobile: {
    fontSize: 10,
    marginTop: 4,
  },
});
