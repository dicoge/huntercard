import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Linking, Image, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { COLORS } from '../constants';

// 卡牌稀有度顏色
const rarityColors: Record<string, string> = {
  'C': COLORS.rarityC,
  'U': COLORS.rarityU,
  'R': COLORS.rarityR,
  'SR': COLORS.raritySR,
  'UC': COLORS.rarityUC,
  'CP': COLORS.rarityCP,
};

// 預先定義的卡牌資料（用於系列搜尋）
const CARD_DATABASE = [
  { cardNumber: 'hBP01-001', member: '時乃空', rarity: 'C' },
  { cardNumber: 'hBP01-002', member: '蘿蔔子', rarity: 'C' },
  { cardNumber: 'hBP01-003', member: '星街すいせい', rarity: 'U' },
  { cardNumber: 'hBP01-004', member: '白上フブキ', rarity: 'U' },
  { cardNumber: 'hBP01-005', member: '湊あくあ', rarity: 'R' },
  { cardNumber: 'hBP01-006', member: '大神ミオ', rarity: 'C' },
  { cardNumber: 'hBP01-007', member: '不知火フレア', rarity: 'SR' },
  { cardNumber: 'hSD01-001', member: '時乃空', rarity: 'C' },
  { cardNumber: 'hSD01-002', member: 'AZKi', rarity: 'R' },
  { cardNumber: 'hBP02-001', member: '百鬼あやめ', rarity: 'R' },
  { cardNumber: 'hBP02-002', member: '猫又おかゆ', rarity: 'SR' },
];

interface CardResult {
  cardNumber: string;
  member: string;
  rarity: string;
  imageUrl: string;
  officialUrl: string;
  prices: Array<{ source: string; url: string }>;
}

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CardResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'single' | 'series' | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    const trimmedQuery = query.trim().toUpperCase();
    
    // 判斷搜尋類型
    const fullCardRegex = /^[A-Z]{2,4}-\d{3}$/;
    const seriesRegex = /^[A-Z]{2,4}\d{2}$/;
    
    setLoading(true);
    setError(null);
    setResults([]);
    
    try {
      if (fullCardRegex.test(trimmedQuery)) {
        // 完整卡號搜尋（如 hBP01-001）
        setSearchType('single');
        const card = createCardResult(trimmedQuery);
        setResults([card]);
      } else if (seriesRegex.test(trimmedQuery)) {
        // 系列搜尋（如 hBP01）
        setSearchType('series');
        const seriesCards = CARD_DATABASE.filter(c => 
          c.cardNumber.startsWith(trimmedQuery)
        );
        
        if (seriesCards.length === 0) {
          setError(`找不到 ${trimmedQuery} 系列的卡牌`);
        } else {
          const cardResults = seriesCards.map(c => createCardResult(c.cardNumber));
          setResults(cardResults);
        }
      } else {
        setError('請輸入有效的卡號格式（如 hBP01-001 或 hBP01）');
      }
    } catch (err) {
      setError('查詢失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const createCardResult = (cardNumber: string): CardResult => {
    const seriesCode = cardNumber.split('-')[0] || '';
    return {
      cardNumber,
      member: '查詢中...',
      rarity: 'R',
      imageUrl: `https://hololive-official-cardgame.com/wp-content/themes/hololive-cardgame/images/card/${cardNumber}.png`,
      officialUrl: `https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=${seriesCode}`,
      prices: [
        {
          source: '官方網站',
          url: `https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=${seriesCode}`,
        },
        {
          source: '遊々亭',
          url: `https://yuyu-tei.jp/top/hocg/?s=${cardNumber}`,
        },
        {
          source: 'Carousell',
          url: `https://www.carousell.com.tw/search/?q=${encodeURIComponent(cardNumber)}`,
        },
      ],
    };
  };

  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  const renderCard = ({ item }: { item: CardResult }) => (
    <View style={styles.cardResult}>
      {/* 卡牌圖片 */}
      <View style={styles.cardImageSection}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      </View>

      {/* 卡牌資訊 */}
      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardNumber}>{item.cardNumber}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColors[item.rarity] || COLORS.surfaceLight }]}>
            <Text style={styles.rarityText}>{item.rarity}</Text>
          </View>
        </View>

        <Text style={styles.cardMember}>{item.member}</Text>

        {/* 查詢連結 */}
        <View style={styles.cardLinks}>
          {item.prices.map((price, index) => (
            <TouchableOpacity
              key={index}
              style={styles.cardLinkButton}
              onPress={() => openUrl(price.url)}
            >
              <Text style={styles.cardLinkSource}>{price.source}</Text>
              <Text style={styles.cardLinkHint}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* 搜尋欄 */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="輸入卡號（hBP01-001）或系列（hBP01）"
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>查詢</Text>
        </TouchableOpacity>
      </View>

      {/* 說明 */}
      <View style={styles.hintBox}>
        <Text style={styles.hintTitle}>📝 搜尋說明</Text>
        <Text style={styles.hintText}>• 完整卡號：hBP01-001 → 顯示單張卡牌</Text>
        <Text style={styles.hintText}>• 系列代碼：hBP01 → 顯示該系列所有卡牌</Text>
      </View>

      {/* 錯誤訊息 */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      )}

      {/* 載入中 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>正在查詢卡牌資訊...</Text>
        </View>
      )}

      {/* 搜尋結果 */}
      {!loading && results.length > 0 && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultHeader}>
            {searchType === 'series' 
              ? `找到 ${results.length} 張卡牌（${query.toUpperCase()} 系列）`
              : `找到 ${results.length} 張卡牌`}
          </Text>
          
          {results.map((card, index) => (
            <View key={index}>
              {renderCard({ item: card })}
            </View>
          ))}
        </View>
      )}
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
  errorContainer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  resultContainer: {
    gap: 16,
  },
  resultHeader: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardResult: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardImageSection: {
    width: 120,
    height: 160,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardNumber: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  rarityText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardMember: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  cardLinks: {
    gap: 8,
  },
  cardLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cardLinkSource: {
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
  },
  cardLinkHint: {
    color: COLORS.primary,
    fontSize: 16,
  },
});
