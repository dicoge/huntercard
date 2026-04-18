import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants';

interface SearchResultItem {
  title: string;
  price?: number;
  url: string;
  imageUrl?: string;
  inStock?: boolean;
}

interface SearchResult {
  source: string;
  items: SearchResultItem[];
}

interface SearchResultsScreenProps {
  route: {
    params: {
      query: string;
    };
  };
}

export default function SearchResultsScreen({ route }: SearchResultsScreenProps) {
  const { query } = route.params;
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
          throw new Error('搜尋失敗');
        }
        
        const data = await response.json();
        setResults(data.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '搜尋失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>正在搜尋卡牌資訊...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.queryText}>搜尋結果：{query}</Text>
        <Text style={styles.resultCount}>
          從 {results.length} 個來源找到結果
        </Text>
      </View>

      {results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>找不到相關結果</Text>
          <Text style={styles.emptySubtext}>試試看其他關鍵字</Text>
        </View>
      ) : (
        results.map((result, sourceIndex) => (
          <View key={sourceIndex} style={styles.sourceSection}>
            <Text style={styles.sourceTitle}>{result.source}</Text>
            
            {result.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={styles.itemCard}
                onPress={() => openUrl(item.url)}
                activeOpacity={0.7}
              >
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  
                  {item.price !== undefined && (
                    <Text style={styles.itemPrice}>
                      NT$ {item.price.toLocaleString()}
                    </Text>
                  )}
                  
                  <Text style={styles.itemUrl} numberOfLines={1}>
                    {item.url}
                  </Text>
                  
                  {item.inStock !== undefined && (
                    <Text style={[
                      styles.itemStock,
                      item.inStock ? styles.inStock : styles.outOfStock
                    ]}>
                      {item.inStock ? '✓ 有庫存' : '✗ 缺貨'}
                    </Text>
                  )}
                </View>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))
      )}

      {/* 說明 */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          點擊任一結果將開啟該網站的詳細頁面。{'\n'}
          建議比較不同來源的價格和庫存狀況。
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
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
  emptyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  sourceSection: {
    marginBottom: 24,
  },
  sourceTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  itemPrice: {
    color: COLORS.success,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemUrl: {
    color: COLORS.primary,
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
  },
  itemStock: {
    fontSize: 12,
    fontWeight: '600',
  },
  inStock: {
    color: COLORS.success,
  },
  outOfStock: {
    color: COLORS.error,
  },
  arrow: {
    color: COLORS.primary,
    fontSize: 20,
    marginLeft: 12,
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
