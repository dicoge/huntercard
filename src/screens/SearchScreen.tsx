import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Linking, Image, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants';
import { HoloCard } from '../types/hololive';

// 卡牌稀有度顏色
const rarityColors: Record<string, string> = {
  'C': COLORS.rarityC,
  'U': COLORS.rarityU,
  'R': COLORS.rarityR,
  'SR': COLORS.raritySR,
  'UC': COLORS.rarityUC,
  'CP': COLORS.rarityCP,
};

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<HoloCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    const trimmedQuery = query.trim();
    
    // 支援多種卡號格式
    const cardNumberRegex = /^[a-zA-Z]{2,4}-?\\d{3}$/i;
    
    if (!cardNumberRegex.test(trimmedQuery)) {
      setError('請輸入有效的卡號格式（如 hBP01-001）');
      return;
    }
    
    setLoading(true);
    setError(null);
    setCard(null);
    
    // 標準化卡號格式
    const standardized = trimmedQuery.toUpperCase().replace(/^([A-Z]+)(\d+)-?(\d+)$/, '$1$2-$3');
    
    try {
      // 構建卡牌資料
      const cardData: HoloCard = {
        id: standardized.toLowerCase(),
        cardNumber: standardized,
        member: '查詢中...',
        memberJp: '',
        series: 'hololive OCG',
        seriesCode: standardized.split('-')[0] || '',
        rarity: 'R',
        imageUrl: `https://hololive-official-cardgame.com/wp-content/themes/hololive-cardgame/images/card/${standardized}.png`,
        description: '點擊下方連結查看詳細資訊',
        category: 'hololive',
        prices: [
          {
            source: '官方網站',
            price: 0,
            currency: 'TWD',
            url: `https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=${standardized.split('-')[0]}`,
            inStock: true,
            lastUpdated: new Date().toISOString(),
          },
          {
            source: '遊々亭',
            price: 0,
            currency: 'TWD',
            url: `https://yuyu-tei.jp/top/hocg/?s=${standardized}`,
            inStock: true,
            lastUpdated: new Date().toISOString(),
          },
          {
            source: 'Carousell',
            price: 0,
            currency: 'TWD',
            url: `https://www.carousell.com.tw/search/?q=${encodeURIComponent(standardized)}`,
            inStock: true,
            lastUpdated: new Date().toISOString(),
          },
        ],
      };
      
      setCard(cardData);
    } catch (err) {
      setError('查詢失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 搜尋欄 */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="輸入卡號（如 hBP01-001）"
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

      {/* 卡牌結果 */}
      {card && !loading && (
        <View style={styles.resultContainer}>
          {/* 卡牌圖片 */}
          <View style={styles.imageSection}>
            <Image
              source={{ uri: card.imageUrl }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          </View>

          {/* 卡牌基本資訊 */}
          <View style={styles.infoSection}>
            <View style={styles.header}>
              <Text style={styles.cardNumber}>{card.cardNumber}</Text>
              <View style={[styles.rarityBadge, { backgroundColor: rarityColors[card.rarity] || COLORS.surfaceLight }]}>
                <Text style={styles.rarityText}>{card.rarity}</Text>
              </View>
            </View>

            <Text style={styles.series}>{card.series}</Text>
            <Text style={styles.description}>{card.description}</Text>
          </View>

          {/* 查詢連結 */}
          <View style={styles.linksSection}>
            <Text style={styles.sectionTitle}>🔗 查詢價格與詳情</Text>
            
            {card.prices?.map((price, index) => (
              <TouchableOpacity
                key={index}
                style={styles.linkButton}
                onPress={() => openUrl(price.url)}
              >
                <Text style={styles.linkSource}>{price.source}</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>{price.url}</Text>
                <Text style={styles.linkHint}>點擊開啟</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 說明 */}
          <View style={styles.hintSection}>
            <Text style={styles.hintText}>
              💡 點擊上方連結可查看各網站的價格和庫存狀況
            </Text>
          </View>
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
  imageSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
  },
  cardImage: {
    width: 200,
    height: 280,
    borderRadius: 8,
  },
  infoSection: {
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardNumber: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  rarityText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  series: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  linksSection: {
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  linkSource: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    width: 80,
  },
  linkUrl: {
    color: COLORS.primary,
    fontSize: 12,
    flex: 1,
  },
  linkHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  hintSection: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  hintText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
