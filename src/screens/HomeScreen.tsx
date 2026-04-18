import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants';
import { usePopularCards } from '../hooks/useHoloSearch';
import { HoloCard } from '../types/hololive';

// ----------------------------------------
// 熱門卡牌元件
// ----------------------------------------
const PopularCard = ({ card, onPress }: { card: HoloCard; onPress: () => void }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.cardContent}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardNumber}>{card.cardNumber}</Text>
        <View style={[styles.rarityBadge, styles[`rarity${card.rarity}`]]}>
          <Text style={styles.rarityText}>{card.rarity}</Text>
        </View>
      </View>
      <Text style={styles.memberName}>{card.member}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {card.description}
      </Text>
      {card.prices && card.prices.length > 0 && (
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>最低價：</Text>
          <Text style={styles.priceValue}>
            NT$ {Math.min(...card.prices.map(p => p.price)).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

// ----------------------------------------
// 首頁畫面
// ----------------------------------------
export default function HomeScreen() {
  const { loading, error, cards } = usePopularCards(20);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔥 熱門卡牌</Text>
        <Text style={styles.subtitle}>hololive 卡牌價格查詢</Text>
      </View>
      
      <FlatList
        data={cards}
        renderItem={({ item }) => (
          <PopularCard 
            card={item} 
            onPress={() => console.log('Press:', item.cardNumber)}
          />
        )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    marginBottom: 20,
    paddingTop: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
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
  rarityN: { backgroundColor: '#6b7280' },
  rarityR: { backgroundColor: '#10b981' },
  raritySR: { backgroundColor: '#3b82f6' },
  rarityUR: { backgroundColor: '#8b5cf6' },
  raritySSR: { backgroundColor: '#f59e0b' },
  memberName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  priceValue: {
    color: COLORS.success,
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
  },
});
