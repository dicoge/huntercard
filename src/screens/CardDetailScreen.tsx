import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../constants';
import { HoloCard } from '../types/hololive';

interface CardDetailScreenProps {
  route: {
    params: {
      card: HoloCard;
    };
  };
}

export default function CardDetailScreen({ route }: CardDetailScreenProps) {
  const { card } = route.params;

  return (
    <ScrollView style={styles.container}>
      {/* 卡牌頭像區域 */}
      <View style={styles.header}>
        <View style={styles.cardNumberBadge}>
          <Text style={styles.cardNumberText}>{card.cardNumber}</Text>
        </View>
        <View style={[styles.rarityBadge, styles[`rarity${card.rarity}`]]}>
          <Text style={styles.rarityText}>{card.rarity}</Text>
        </View>
      </View>

      {/* 成員資訊 */}
      <View style={styles.infoSection}>
        <Text style={styles.memberName}>{card.member}</Text>
        <Text style={styles.memberNameJp}>{card.memberJp}</Text>
        <Text style={styles.series}>{card.series}</Text>
      </View>

      {/* 描述 */}
      {card.description && (
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>簡介</Text>
          <Text style={styles.description}>{card.description}</Text>
        </View>
      )}

      {/* 價格資訊 */}
      {card.prices && card.prices.length > 0 && (
        <View style={styles.priceSection}>
          <Text style={styles.sectionTitle}>💰 價格比較</Text>
          {card.prices.map((price, index) => (
            <View key={index} style={styles.priceItem}>
              <View style={styles.priceHeader}>
                <Text style={styles.priceSource}>{price.source}</Text>
                <Text style={styles.priceValue}>
                  {price.currency === 'TWD' ? 'NT$' : '¥'} {price.price.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.priceCondition}>
                條件：{price.condition} | 庫存：{price.inStock ? '有' : '缺貨'}
              </Text>
              <Text style={styles.priceUrl} numberOfLines={1}>
                {price.url}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 發行日期 */}
      {card.releaseDate && (
        <View style={styles.metaSection}>
          <Text style={styles.metaLabel}>發行日期</Text>
          <Text style={styles.metaValue}>{card.releaseDate}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
  },
  cardNumberBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardNumberText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  rarityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  rarityText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  rarityN: { backgroundColor: COLORS.rarityN },
  rarityR: { backgroundColor: COLORS.rarityR },
  raritySR: { backgroundColor: COLORS.raritySR },
  rarityUR: { backgroundColor: COLORS.rarityUR },
  raritySSR: { backgroundColor: COLORS.raritySSR },
  infoSection: {
    padding: 20,
    paddingTop: 0,
  },
  memberName: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberNameJp: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: 8,
  },
  series: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  descriptionSection: {
    padding: 20,
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  priceSection: {
    padding: 20,
    paddingTop: 0,
  },
  priceItem: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceSource: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  priceValue: {
    color: COLORS.success,
    fontSize: 20,
    fontWeight: 'bold',
  },
  priceCondition: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  priceUrl: {
    color: COLORS.primary,
    fontSize: 12,
  },
  metaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metaLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  metaValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
