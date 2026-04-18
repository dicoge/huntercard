import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants';
import { useHoloSearch } from '../hooks/useHoloSearch';
import { HoloCard } from '../types/hololive';

// ----------------------------------------
// 搜尋卡片元件
// ----------------------------------------
const SearchCard = ({ card, onPress }: { card: HoloCard; onPress: () => void }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardNumber}>{card.cardNumber}</Text>
      <View style={[styles.rarityBadge, styles[`rarity${card.rarity}`]]}>
        <Text style={styles.rarityText}>{card.rarity}</Text>
      </View>
    </View>
    <Text style={styles.memberName}>{card.member}</Text>
    <Text style={styles.series}>{card.series}</Text>
    {card.prices && card.prices.length > 0 && (
      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>最低價格：</Text>
        <Text style={styles.priceValue}>
          NT$ {Math.min(...card.prices.map(p => p.price)).toLocaleString()}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

// ----------------------------------------
// 搜尋畫面
// ----------------------------------------
export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const { loading, error, result, search } = useHoloSearch();

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    // 判斷是否為卡號格式（如 hlo-001）
    const cardNumberRegex = /^[a-z]{2,3}-\d{3}$/i;
    if (cardNumberRegex.test(query.trim())) {
      await search({ cardNumber: query.trim() });
    } else {
      await search({ keyword: query.trim() });
    }
  };

  const renderCard = ({ item }: { item: HoloCard }) => (
    <SearchCard 
      card={item} 
      onPress={() => console.log('Press card:', item.cardNumber)}
    />
  );

  return (
    <View style={styles.container}>
      {/* 搜尋欄 */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="輸入卡號或關鍵字..."
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>搜尋</Text>
        </TouchableOpacity>
      </View>

      {/* 載入中 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      )}

      {/* 搜尋結果 */}
      {result && !loading && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultInfo}>
            找到 {result.totalFound} 張卡牌
            {result.hasPrices && '（含價格資訊）'}
          </Text>
          <FlatList
            data={result.cards}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
  },
  resultContainer: {
    flex: 1,
  },
  resultInfo: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 12,
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
  rarityN: { backgroundColor: '#6b7280' },
  rarityR: { backgroundColor: '#10b981' },
  raritySR: { backgroundColor: '#3b82f6' },
  rarityUR: { backgroundColor: '#8b5cf6' },
  raritySSR: { backgroundColor: '#f59e0b' },
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
