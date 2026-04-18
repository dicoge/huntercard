import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { COLORS } from '../constants';

interface PriceInfo {
  source: string;
  value: number;
  currency: string;
  url: string;
  inStock: boolean;
}

interface CardInfo {
  cardNumber: string;
  member: string;
  memberJp: string;
  series: string;
  seriesCode: string;
  rarity: string;
  imageUrl?: string;
  description?: string;
  price?: PriceInfo;
  officialUrl: string;
}

interface SearchResultsScreenProps {
  route: {
    params: {
      query: string;
    };
  };
}

const rarityColors: Record<string, string> = {
  'C': '#6b7280',
  'U': '#10b981',
  'R': '#3b82f6',
  'SR': '#8b5cf6',
  'UC': '#f59e0b',
  'CP': '#ef4444',
  'HLO': '#ff6b9d', // 未知稀有度
};

export default function SearchResultsScreen({ route }: SearchResultsScreenProps) {
  const { query } = route.params;
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<CardInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCard = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/card?q=${encodeURIComponent(query.trim())}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('找不到該卡牌，請檢查卡號是否正確');
          } else {
            setError('查詢失敗，請稍後再試');
          }
          setLoading(false);
          return;
        }
        
        const data: CardInfo = await response.json();
        
        // 如果沒有 member 名稱，從官方網站抓取
        if (data.member === '不明' || !data.member) {
          // 嘗試從官方網站獲取更精確的資訊
          // 這裡可以先顯示基本資訊，讓使用者點擊查看詳情
        }
        
        setCard(data);
      } catch (err) {
        setError('網路錯誤，請檢查網路連線');
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [query]);

  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          正在查詢 {query} 的資訊...{'\n'}
          <Text style={styles.loadingSubtext}>
            正在爬蟲官方網站和價格資訊
          </Text>
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorHint}>試試看正確的卡號格式，如 hBP01-001</Text>
      </View>
    );
  }

  if (!card) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      {/* 卡牌頭像區域 */}
      <View style={[styles.headerSection, { borderLeftColor: rarityColors[card.rarity] || COLORS.surfaceLight }]}>
        <View style={styles.headerTop}>
          <Text style={styles.cardNumber}>{card.cardNumber}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColors[card.rarity] || COLORS.surfaceLight }]}>
            <Text style={styles.rarityText}>{card.rarity}</Text>
          </View>
        </View>

        <Text style={styles.memberName}>
          {card.member !== '不明' ? card.member : '點擊下方查看詳細資訊'}
        </Text>
        
        {card.memberJp && card.memberJp !== card.member && (
          <Text style={styles.memberNameJp}>{card.memberJp}</Text>
        )}

        <Text style={styles.series}>{card.series}</Text>
        
        {card.description ? (
          <Text style={styles.description}>{card.description}</Text>
        ) : (
          <TouchableOpacity onPress={() => openUrl(card.officialUrl)}>
            <Text style={styles.descriptionLink}>查看官方詳細資訊 →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 價格資訊 */}
      {card.price ? (
        <View style={styles.priceSection}>
          <Text style={styles.sectionTitle}>💰 價格資訊</Text>
          <TouchableOpacity 
            style={styles.priceCard}
            onPress={() => openUrl(card.price!.url)}
          >
            <View style={styles.priceRow}>
              <Text style={styles.priceSource}>{card.price.source}</Text>
              <View style={styles.priceRight}>
                <Text style={styles.priceValue}>
                  {card.price.currency === 'TWD' ? 'NT$' : card.price.currency} {card.price.value.toLocaleString()}
                </Text>
                <Text style={[styles.priceStock, card.price.inStock ? styles.inStock : styles.outOfStock]}>
                  {card.price.inStock ? '✓ 有庫存' : '✗ 缺貨'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.priceSection}>
          <Text style={styles.sectionTitle}>💰 價格資訊</Text>
          <TouchableOpacity 
            style={styles.priceCard}
            onPress={() => openUrl(`https://yuyu-tei.jp/top/hocg/?s=${card.cardNumber}`)}
          >
            <Text style={styles.noPriceText}>
              點擊前往遊々亭查看價格 →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 官方連結 */}
      <View style={styles.linksSection}>
        <Text style={styles.sectionTitle}>🔗 相關連結</Text>
        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => openUrl(card.officialUrl)}
        >
          <Text style={styles.linkText}>🏛️ 官方卡牌頁面</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => openUrl(`https://yuyu-tei.jp/top/hocg/?s=${card.cardNumber}`)}
        >
          <Text style={styles.linkText}>🏪 遊々亭搜尋結果</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => openUrl(`https://www.carousell.com.tw/search/?q=${encodeURIComponent(card.cardNumber)}`)}
        >
          <Text style={styles.linkText}>🔄 Carousell 搜尋結果</Text>
        </TouchableOpacity>
      </View>

      {/* 說明 */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          價格資訊來自遊々亭，僅供參考。{'\n'}
          實際價格以網站顯示為準。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 13,
    fontWeight: 'normal',
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  headerSection: {
    padding: 20,
    borderRadius: 16,
    margin: 16,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.primary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardNumber: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
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
  memberName: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberNameJp: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  series: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  descriptionLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  priceSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  priceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceSource: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  priceRight: {
    alignItems: 'flex-end',
  },
  priceValue: {
    color: COLORS.success,
    fontSize: 20,
    fontWeight: 'bold',
  },
  priceStock: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  inStock: {
    color: COLORS.success,
  },
  outOfStock: {
    color: COLORS.error,
  },
  noPriceText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  linksSection: {
    padding: 20,
    paddingTop: 0,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
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
