import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants';
import { HoloCard } from '../types/hololive';

interface SearchResultsScreenProps {
  route: {
    params: {
      query: string;
      results: {
        cards: HoloCard[];
        totalFound: number;
      };
    };
  };
}

export default function SearchResultsScreen({ route }: SearchResultsScreenProps) {
  const { query, results } = route.params;

  const renderCard = ({ item }: { item: HoloCard }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardNumber}>{item.cardNumber}</Text>
        <View style={[styles.rarityBadge, styles[`rarity${item.rarity}`]]}>
          <Text style={styles.rarityText}>{item.rarity}</Text>
        </View>
      </View>
      <Text style={styles.memberName}>{item.member}</Text>
      <Text style={styles.series}>{item.series}</Text>
      {item.prices && item.prices.length > 0 && (
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>最低價：</Text>
          <Text style={styles.priceValue}>
            NT$ {Math.min(...item.prices.map(p => p.price)).toLocaleString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.queryText}>搜尋：{query}</Text>
        <Text style={styles.resultCount}>找到 {results.totalFound} 張卡牌</Text>
      </View>
      <FlatList
        data={results.cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  queryText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultCount: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardNumber: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  rarityText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rarityN: { backgroundColor: COLORS.rarityN },
  rarityR: { backgroundColor: COLORS.rarityR },
  raritySR: { backgroundColor: COLORS.raritySR },
  rarityUR: { backgroundColor: COLORS.rarityUR },
  raritySSR: { backgroundColor: COLORS.raritySSR },
  memberName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  series: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  priceValue: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
