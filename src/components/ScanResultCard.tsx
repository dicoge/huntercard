/**
 * ScanResultCard.tsx
 *
 * Floating price card overlay on camera view.
 * Shows card name, card ID, price, and confidence indicator.
 * Auto-dismisses after 5 seconds or on tap.
 *
 * Style inspired by Rare Candy Scanner 3.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants';
import { CardInfo } from '../services/cardRecognition';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ScanResultCardProps {
  /** The recognized card info */
  card: CardInfo;
  /** Whether the card is visible */
  visible: boolean;
  /** Confidence level 0-1 (from OCR) */
  confidence?: number;
  /** Callback when card is dismissed */
  onDismiss: () => void;
  /** Auto-dismiss duration in ms (default: 5000) */
  autoDismissMs?: number;
}

export default function ScanResultCard({
  card,
  visible,
  confidence = 1,
  onDismiss,
  autoDismissMs = 5000,
}: ScanResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      // Slide in from top
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 60,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss
      dismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);
    } else {
      // Reset
      slideAnim.setValue(0);
      opacityAnim.setValue(0);
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  // Generate rarity badge color
  const getRarityColor = (rarity: string): string => {
    const colors: Record<string, string> = {
      C: '#6b7280',
      U: '#10b981',
      R: '#3b82f6',
      SR: '#8b5cf6',
      UC: '#f59e0b',
      CP: '#ef4444',
    };
    return colors[rarity] || COLORS.textSecondary;
  };

  // Format price display
  const priceDisplay = card.sellPrice != null
    ? `¥${card.sellPrice.toLocaleString()}`
    : '—';

  // Confidence indicator
  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor = confidencePercent >= 80
    ? '#10b981'
    : confidencePercent >= 50
      ? '#f59e0b'
      : '#ef4444';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 0],
            }),
          }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={handleDismiss}
        activeOpacity={0.9}
      >
        {/* Header row: rarity badge + confidence */}
        <View style={styles.headerRow}>
          <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(card.rarity) }]}>
            <Text style={styles.rarityText}>{card.rarity}</Text>
          </View>
          <View style={[styles.confidenceBadge, { borderColor: confidenceColor }]}>
            <Text style={[styles.confidenceText, { color: confidenceColor }]}>
              {confidencePercent}%
            </Text>
          </View>
          <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Card info */}
        <View style={styles.infoContainer}>
          <Text style={styles.cardName} numberOfLines={2}>
            {card.name}
          </Text>
          <Text style={styles.cardId}>
            #{card.cardNumber || card.id}
          </Text>
        </View>

        {/* Price row */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>估值</Text>
          <Text style={styles.priceValue}>{priceDisplay}</Text>
        </View>

        {/* Series info */}
        {card.series ? (
          <Text style={styles.seriesText} numberOfLines={1}>
            {card.series}
          </Text>
        ) : null}

        {/* Multi-price variants section */}
        {(card.variants && card.variants.length > 0) || (card.prices && card.prices.length > 1) ? (
          <TouchableOpacity
            style={styles.variantsToggle}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.variantsToggleText}>
              {expanded ? '▲ 收起其他版本' : '▼ 查看其他版本'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {expanded && (
          <View style={styles.variantsContainer}>
            {/* Show variants from reprints (same cardNumber, different series) */}
            {card.variants && card.variants.length > 0 && (
              <>
                {card.variants.map((v, i) => (
                  <View key={`v-${i}`} style={styles.variantRow}>
                    <Text style={styles.variantLabel} numberOfLines={1}>
                      {v.seriesName || v.series}
                    </Text>
                    <Text style={[
                      styles.variantPrice,
                      v.sellPrice != null ? styles.variantPricePositive : styles.variantPriceNull,
                    ]}>
                      {v.sellPrice != null ? `¥${v.sellPrice.toLocaleString()}` : '—'}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Show detailed price variants (from the prices array) */}
            {card.prices && card.prices.length > 1 && (
              <>
                {card.prices.map((p, i) => (
                  <View key={`p-${i}`} style={styles.variantRow}>
                    <Text style={styles.variantLabel} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={[
                      styles.variantPrice,
                      p.sellPrice != null ? styles.variantPricePositive : styles.variantPriceNull,
                    ]}>
                      {p.sellPrice != null ? `¥${p.sellPrice.toLocaleString()}` : '—'}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Dismiss hint */}
        <Text style={styles.dismissHint}>點擊關閉</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 40,
  },
  card: {
    backgroundColor: 'rgba(15, 15, 35, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    padding: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rarityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  confidenceBadge: {
    marginLeft: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  closeText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  infoContainer: {
    marginBottom: 8,
  },
  cardName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  cardId: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  priceLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  priceValue: {
    color: '#00C853',
    fontSize: 24,
    fontWeight: 'bold',
  },
  seriesText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  dismissHint: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
  // Variants section
  variantsToggle: {
    marginTop: 8,
    paddingVertical: 4,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  variantsToggleText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  variantsContainer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 6,
  },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  variantLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  variantPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  variantPricePositive: {
    color: '#00C853',
  },
  variantPriceNull: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
});