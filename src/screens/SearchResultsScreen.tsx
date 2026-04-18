import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Linking, ActivityIndicator, Image } from 'react-native';
import { COLORS } from '../constants';
import cardData from '../data/hololive-cards.json';

interface Card {
  id: string;
  cardNumber: string;
  member: string;
  memberJp: string;
  series: string;
  seriesCode: string;
  rarity: string;
  imageUrl?: string;
  description?: string;
  prices?: Array<{ source: string; price: number; url: string; inStock: boolean }>;
}

interface SearchResultsScreenProps {
  route: {
    params: {
      query: string;
    };
  };
}

const rarityColors: Record<string, string> = {
  'C': COLORS.rarityC,
  'U': COLORS.rarityU,
  'R': COLORS.rarityR,
  'SR': COLORS.raritySR,
  'UC': COLORS.rarityUC,
  'CP': COLORS.rarityCP,
};

export default function SearchResultsScreen({ route }: SearchResultsScreenProps) {
  const { query } = route.params;
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Card[]>([]);

  useEffect(() => {
    const searchCards = async () => {
      setLoading(true);
      
      // 模擬延遲讓使用者看到載入動畫
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const searchQuery = query.toLowerCase().trim();
      
      // 從本地資料庫搜尋
      let filtered = cardData.cards.filter((card: Card) => {
        return (
          card.cardNumber.toLowerCase().includes(searchQuery) ||
          card.member.toLowerCase().includes(searchQuery) ||
          card.memberJp.toLowerCase().includes(searchQuery) ||
          card.series.toLowerCase().includes(searchQuery) ||
          card.seriesCode.toLowerCase().includes(searchQuery) ||
          card.description?.toLowerCase().includes(searchQuery)
        );
      });
      
      // 為每張卡牌添加價格資訊（模擬）
      filtered = filtered.map((card: Card) => ({
        ...card,
        prices: [
          {
            source: '遊々亭',
            price: Math.floor(Math.random() * 3000) + 500,
            url: `https://yuyu-tei.jp/top/hocg/?s=${card.cardNumber}`,
            inStock: Math.random() > 0.3,
          },
          {
            source: 'Carousell',
            price: Math.floor(Math.random() * 2500) + 300,
            url: `https://www.carousell.com.tw/search/?q=${encodeURIComponent(card.cardNumber)}`,
            inStock: Math.random() > 0.4,
          },
        ],
      }));
      
      setResults(filtered);
      setLoading(false);
    };

    searchCards();
  }, [query]);

  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>正在搜尋卡牌...</Text>
      </View>
    );
  }

  const renderCard = ({ item: card }: { item: Card }) => (
    <View style={styles.cardCard}>
      {/* 稀有度顏色條 */}
      <View style={[styles.rarityBar, { backgroundColor: rarityColors[card.rarity] || COLORS.surfaceLight }]} />
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardNumber}>{card.cardNumber}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColors[card.rarity] || COLORS.surfaceLight }]}>
            <Text style={styles.rarityText}>{card.rarity}</Text>
          </View>
        </View>

        <Text style={styles.memberName} numberOfLines={1}>
          {card.member}
        </Text>
        
        <Text style={styles.memberNameJp} numberOfLines={1}>
          {card.memberJp}
        </Text>

        <Text style={styles.series} numberOfLines={1}>
          {card.series}
        </Text>

        {card.description && (
          <Text style={styles.description} numberOfLines={2}>
            {card.description}
          </Text>
        )}

        {/* 價格資訊 */}
        {card.prices && card.prices.length > 0 && (
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>價格比較：</Text>
            {card.prices.map((price, index) => (
              <TouchableOpacity
                key={index}
                style={styles.priceItem}
                onPress={() => openUrl(price.url)}
              >
                <Text style={styles.priceSource}>{price.source}</Text>
                <Text style={styles.priceValue}>NT$ {price.price.toLocaleString()}</Text>
                <Text style={[
                  styles.priceStock,
                  price.inStock ? styles.inStock : styles.outOfStock
                ]}>
                  {price.inStock ? '✓' : '✗'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.queryText}>搜尋結果：{query}</Text>
        <Text style={styles.resultCount}>
          找到 {results.length} 張卡牌
        </Text>
      </View>

      {results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>找不到符合的卡牌</Text>
          <Text style={styles.emptySubtext}>試試看其他關鍵字，如卡號、成員名稱或系列</Text>
        </View>
      ) : (
        results.map((card, index) => (
          <View key={index}>
            {renderCard({ item: card })}
          </View>
        ))
      )}

      {/* 說明 */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          點擊價格可開啟該網站查看詳細資訊。{'\n'}
          價格僅供參考，實際價格以網站顯示為準。
        </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  header: {
    marginBottom: 20,
  },
  queryText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultCount: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
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
  },
  cardCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rarityBar: {
    width: 6,
    minWidth: 6,
  },
  cardContent: {
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
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 35,
    alignItems: 'center',
  },
  rarityText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: 'bold',
  },
  memberName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  memberNameJp: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  series: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  priceSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  priceSource: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    width: 80,
  },
  priceValue: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  priceStock: {
    fontSize: 14,
    width: 30,
    textAlign: 'right',
    fontWeight: '600',
  },
  inStock: {
    color: COLORS.success,
  },
  outOfStock: {
    color: COLORS.error,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
