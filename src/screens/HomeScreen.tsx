import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants';

const popularCards = [
  { id: 'hBP01-007', name: '星街すいせい', series: 'ブルーミングレディアンス', rarity: 'R', cardNumber: 'hBP01-007' },
  { id: 'hBP01-004', name: '兎田ぺこら', series: 'ブルーミングレディアンス', rarity: 'R', cardNumber: 'hBP01-004' },
  { id: 'hBP01-042', name: '兎田ぺこら', series: 'ブルーミングレディアンス', rarity: 'R', cardNumber: 'hBP01-042' },
  { id: 'hBP01-014', name: '天音かなた', series: 'ブルーミングレディアンス', rarity: 'R', cardNumber: 'hBP01-014' },
  { id: 'hBP01-005', name: '鷹嶺ルイ', series: 'ブルーミングレディアンス', rarity: 'R', cardNumber: 'hBP01-005' },
  { id: 'hBP01-006', name: '小鳥遊キアラ', series: 'ブルーミングレディアンス', rarity: 'R', cardNumber: 'hBP01-006' },
];

const rarityColors: Record<string, string> = {
  C: '#6b7280', U: '#10b981', R: '#3b82f6', SR: '#f59e0b', N: '#6b7280',
};

export default function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌸 HoloHunter</Text>
        <Text style={styles.subtitle}>hololive TCG 卡牌查價工具</Text>
      </View>

      <TouchableOpacity
        style={styles.searchPrompt}
        onPress={() => navigation.navigate('Search')}
        activeOpacity={0.7}
      >
        <Text style={styles.searchPromptText}>🔍 輸入卡號或關鍵字搜尋卡牌</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>🔥 熱門卡牌</Text>

      <FlatList
        data={popularCards}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.popCard}
            onPress={() => navigation.navigate('SearchResults', { query: item.cardNumber })}
            activeOpacity={0.7}
          >
            <View style={[styles.popRarity, { backgroundColor: rarityColors[item.rarity] }]}>
              <Text style={styles.popRarityText}>{item.rarity}</Text>
            </View>
            <Text style={styles.popNumber} numberOfLines={1}>{item.cardNumber}</Text>
            <Text style={styles.popName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.popSeries} numberOfLines={1}>{item.series}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.popList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { marginBottom: 20, paddingTop: 8 },
  title: { color: COLORS.primary, fontSize: 30, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14 },
  searchPrompt: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  searchPromptText: { color: COLORS.text, fontSize: 15, textAlign: 'center' },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  popList: { paddingRight: 16 },
  popCard: {
    width: 160,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  popRarity: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  popRarityText: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
  popNumber: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  popName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  popSeries: { color: COLORS.textSecondary, fontSize: 11 },
});
