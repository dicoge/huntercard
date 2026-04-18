import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { COLORS } from '../constants';

interface SearchResultsScreenProps {
  route: {
    params: {
      query: string;
      links: Array<{ name: string; url: string; hint: string }>;
    };
  };
}

export default function SearchResultsScreen({ route }: SearchResultsScreenProps) {
  const { query, links } = route.params;

  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 搜尋關鍵字 */}
      <View style={styles.header}>
        <Text style={styles.queryText}>搜尋：{query}</Text>
        <Text style={styles.resultCount}>以下網站提供相關結果</Text>
      </View>

      {/* 搜尋連結列表 */}
      <View style={styles.linksContainer}>
        {links.map((link, index) => (
          <TouchableOpacity
            key={index}
            style={styles.linkCard}
            onPress={() => openUrl(link.url)}
            activeOpacity={0.7}
          >
            <View style={styles.linkHeader}>
              <Text style={styles.linkName}>{link.name}</Text>
              <Text style={styles.linkArrow}>→</Text>
            </View>
            <Text style={styles.linkHint}>{link.hint}</Text>
            <Text style={styles.linkUrl} numberOfLines={1}>{link.url}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 說明 */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          點擊上方任一連結，將在瀏覽器中開啟該網站的搜尋結果頁面。{'\n\n'}
          建議先查看官方卡牌列表取得完整資訊，再比較各二手網站的價格。
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
  linksContainer: {
    gap: 12,
  },
  linkCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkArrow: {
    color: COLORS.primary,
    fontSize: 20,
  },
  linkHint: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  linkUrl: {
    color: COLORS.primary,
    fontSize: 12,
    opacity: 0.8,
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
