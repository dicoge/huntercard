import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants';
import { useHoloSearch } from '../hooks/useHoloSearch';
import CardItem from '../components/CardItem';
import { HoloCard } from '../types/hololive';

// ----------------------------------------
// 搜尋畫面
// ----------------------------------------
export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const { loading, error, result, search } = useHoloSearch();

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    const trimmedQuery = query.trim();
    
    // 支援多種卡號格式
    // hBP01-001, hbp01-001, HBP01-001, hSD01-001
    const cardNumberRegex = /^[a-zA-Z]{2,4}-?\d{3}$/i;
    
    if (cardNumberRegex.test(trimmedQuery)) {
      // 標準化卡號格式
      const standardized = trimmedQuery.toUpperCase().replace(/^([A-Z]+)(\d+)-?(\d+)$/, '$1$2-$3');
      await search({ cardNumber: standardized });
    } else {
      // 使用成員名稱或關鍵字搜尋
      await search({ memberName: trimmedQuery, keyword: trimmedQuery });
    }
  };

  const handleCardPress = (card: HoloCard) => {
    navigation.navigate('CardDetail', { card });
  };

  return (
    <View style={styles.container}>
      {/* 搜尋欄 */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="輸入卡號（如 hBP01-001）或成員名稱..."
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
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
            {result.totalFound === 0 
              ? '找不到符合的卡牌' 
              : `找到 ${result.totalFound} 張卡牌`}
          </Text>
          {result.totalFound === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>找不到符合的卡牌</Text>
              <Text style={styles.emptySubtext}>
                試試看：{'\n'}
                • 卡號：hBP01-001, hSD01-001{'\n'}
                • 成員：星街, 時乃空, 白上フブキ
              </Text>
            </View>
          ) : (
            <FlatList
              data={result.cards}
              renderItem={({ item }) => (
                <CardItem 
                  card={item} 
                  onPress={() => handleCardPress(item)}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
            />
          )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
  },
});
