import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Linking, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants';

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    
    setLoading(true);
    
    const trimmedQuery = query.trim();
    
    // 構建各網站的搜尋連結
    const links = [
      {
        name: '官方卡牌列表',
        url: `https://hololive-official-cardgame.com/cardlist/cardsearch/?keyword=${encodeURIComponent(trimmedQuery)}`,
        hint: '官方完整卡牌資料庫',
      },
      {
        name: '遊々亭',
        url: `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(trimmedQuery)}`,
        hint: '日本二手卡牌價格',
      },
      {
        name: 'Carousell 旋轉拍賣',
        url: `https://www.carousell.com.tw/search/?q=${encodeURIComponent(trimmedQuery)}`,
        hint: '台灣二手卡牌價格',
      },
      {
        name: 'Mercari 煤爐',
        url: `https://www.mercari.com/jp/search/?keyword=${encodeURIComponent(trimmedQuery)}`,
        hint: '日本二手卡牌（日文）',
      },
    ];
    
    // 延遲一下讓使用者看到載入動畫
    setTimeout(() => {
      navigation.navigate('SearchResults', { 
        query: trimmedQuery,
        links 
      });
      setLoading(false);
    }, 500);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 搜尋欄 */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="輸入卡號（hBP01-001）或成員名稱..."
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

      {/* 說明 */}
      <View style={styles.hintBox}>
        <Text style={styles.hintTitle}>🔍 搜尋功能</Text>
        <Text style={styles.hintText}>輸入卡號或成員名稱，系統會到以下網站搜尋：</Text>
        <Text style={styles.hintText}>• 官方卡牌列表 - 完整卡牌資訊</Text>
        <Text style={styles.hintText}>• 遊々亭 - 日本二手價格</Text>
        <Text style={styles.hintText}>• Carousell - 台灣二手價格</Text>
        <Text style={styles.hintText}>• Mercari - 日本煤爐價格</Text>
      </View>

      {/* 載入中 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>正在準備搜尋...</Text>
        </View>
      )}

      {/* 熱門搜尋建議 */}
      <View style={styles.suggestions}>
        <Text style={styles.suggestionTitle}>💡 熱門搜尋</Text>
        <View style={styles.suggestionTags}>
          <TouchableOpacity 
            style={styles.suggestionTag}
            onPress={() => setQuery('hBP01')}
          >
            <Text style={styles.suggestionTagText}>hBP01</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.suggestionTag}
            onPress={() => setQuery('星街すいせい')}
          >
            <Text style={styles.suggestionTagText}>星街すいせい</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.suggestionTag}
            onPress={() => setQuery('hSD01')}
          >
            <Text style={styles.suggestionTagText}>hSD01</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.suggestionTag}
            onPress={() => setQuery('湊あくあ')}
          >
            <Text style={styles.suggestionTagText}>湊あくあ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  hintBox: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  hintTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hintText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  suggestions: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
  },
  suggestionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  suggestionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionTag: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  suggestionTagText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
