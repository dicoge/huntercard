import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { COLORS } from '../constants';

const { width } = require('react-native').Dimensions.get('window');

const rarityColors: Record<string, string> = {
  N: '#6b7280', C: '#6b7280', U: '#10b981', R: '#3b82f6', SR: '#f59e0b',
};

const gradeLabels: Record<string, string> = {
  debut: 'Debut', '1st': '1st', '2nd': '2nd', buzz: 'Buzz', spot: 'Spot',
};

interface CardResult {
  id: string;
  name: string;
  type: string;
  grade: string;
  rarity: string;
  colors: string[];
  colorNames: string[];
  series: string[];
  seriesNames: string[];
  tags: string[];
  cardNumber: string;
  imageUrl: string;
  yuyuUrl: string;
  carousellUrl: string;
  officialUrl: string;
  searchKeywords?: string[];
}

interface ApiResponse {
  query: string;
  total: number;
  results: CardResult[];
  error?: string;
}

// Try to find a working image URL by trying multiple versions
function tryImageUrls(card: CardResult): { url: string; fallback: boolean } {
  const base = 'https://tetsunekko.github.io/holotcgtw/cards/';
  const folder = card.imageFolder || '';
  const id = card.cardNumber || card.id;
  const versions = card.versions || [];

  // Try to find a _C.png or _U.png (member card) version — these are most likely to exist
  for (const ver of versions) {
    if (ver.includes('_C.png') || ver.includes('_U.png')) {
      return { url: `${base}${folder}${id}${ver}`, fallback: false };
    }
  }
  // If no member version, use first version (could be Oshi promo)
  const first = versions[0] || '_C.png';
  return { url: `${base}${folder}${id}${first}`, fallback: false };
}

export default function SearchResultsScreen({ route, navigation }: any) {
  const { query } = route.params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://card-hunter-mu.vercel.app/api/search?q=${encodeURIComponent(query.trim())}`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error || `HTTP ${res.status}`);
          return;
        }
        const result: ApiResponse = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '查詢失敗');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [query]);

  const openUrl = (url: string) => Linking.openURL(url);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          正在從 holotcgtw 搜尋卡牌...
        </Text>
        <Text style={styles.loadingSubtext}>搜尋範圍：所有系列卡牌</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyText}>找不到「{query}」的結果</Text>
        <Text style={styles.emptyHint}>試試看日文名稱、卡號、或系列代碼</Text>
      </View>
    );
  }

  const renderCard = ({ item }: { item: CardResult }) => {
    const imgResult = tryImageUrls(item);

    return (
      <CardListItem
        card={item}
        imageUrl={imgResult.url}
        onPress={() => navigation.navigate('CardDetail', { card: item })}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.queryText, { color: COLORS.text }]}>
          搜尋結果：{query}
        </Text>
        <Text style={[styles.resultCount, { color: COLORS.textSecondary }]}>
          找到 {data.total} 張卡牌（來源：holotcgtw）
        </Text>
      </View>

      <FlatList
        data={data.results}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

// ──────────────────────────────────────────────
// Card List Item component (inline to keep things simple)
// ──────────────────────────────────────────────
function CardListItem({ card, imageUrl, onPress }: {
  card: CardResult;
  imageUrl: string;
  onPress: () => void;
}) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* 左邊稀有度條 */}
      <View style={[styles.rarityStrip, { backgroundColor: rarityColors[card.rarity] || '#6b7280' }]} />

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardNumber}>{card.cardNumber}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColors[card.rarity] || '#6b7280' }]}>
            <Text style={styles.rarityText}>{gradeLabels[card.grade] || card.grade}</Text>
          </View>
        </View>

        <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>

        <View style={styles.metaRow}>
          {card.seriesNames.map((s, i) => (
            <Text key={i} style={styles.seriesTag}>{s}</Text>
          ))}
          {card.colorNames.length > 0 && (
            <Text style={styles.colorText}>{card.colorNames.join(' / ')}</Text>
          )}
        </View>

        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickLink} onPress={() => Linking.openURL(card.yuyuUrl)}>
            <Text style={styles.quickLinkText}>遊々亭 →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink} onPress={() => Linking.openURL(card.officialUrl)}>
            <Text style={styles.quickLinkText}>官方卡表 →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 卡牌圖片 */}
      <View style={styles.cardImageWrap}>
        {!imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            resizeMode="contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardImagePlaceholderText}>{gradeLabels[card.grade] || card.grade}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
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
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyHint: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  queryText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultCount: {
    fontSize: 13,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 120,
  },
  rarityStrip: {
    width: 5,
    minWidth: 5,
  },
  cardContent: {
    flex: 1,
    padding: 14,
    paddingRight: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardNumber: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 45,
    alignItems: 'center',
  },
  rarityText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
  },
  cardName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  seriesTag: {
    color: COLORS.textSecondary,
    fontSize: 11,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  colorText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
  },
  quickLink: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickLinkText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardImageWrap: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  cardImage: {
    width: 72,
    height: 100,
  },
  cardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholderText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
