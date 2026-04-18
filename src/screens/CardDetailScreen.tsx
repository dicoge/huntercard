import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Image, ActivityIndicator, Dimensions } from 'react-native';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');
const imageUrl = 'https://tetsunekko.github.io/holotcgtw/cards/';

const gradeLabels: Record<string, string> = {
  debut: 'Debut',
  '1st': '1st',
  '2nd': '2nd',
  buzz: 'Buzz',
  spot: 'Spot',
};

const rarityColors: Record<string, string> = {
  N: '#6b7280',
  C: '#6b7280',
  U: '#10b981',
  R: '#3b82f6',
  SR: '#f59e0b',
};

const COLOR_MAP: Record<string, string> = {
  'white': '白色',
  'blue': '藍色',
  'green': '綠色',
  'red': '紅色',
  'purple': '紫色',
  'yellow': '黃色',
  'colorless': '無色',
};

const SERIES_NAMES: Record<string, string> = {
  'hBP01': 'ブルーミングレディアンス',
  'hBP02': 'クインテットスペクトラム',
  'hBP03': 'サバイバル・オブ・ザ・フェイビアス',
  'hSD01': 'スターターデッキ ときのそら',
  'hSD02': 'スターターデッキ 白上フブキ',
  'hSD03': 'スターターデッキ 湊あくあ',
  'hSD04': 'スターターデッキ 天音かなた',
  'hSD05': 'スターターデッキ ReGLOSS',
  'hSD06': 'スターターデッキ 風真いろは',
  'hSD07': 'スターターデッキ 癒月ちょこ',
  'hPR': 'Promo',
  'hBD24': 'Bandai Distribution 2024',
  'hY': 'Yokohama Promo',
};

export default function CardDetailScreen({ route, navigation }: any) {
  const { card } = route.params;

  if (!card) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.text }}>無法載入卡牌資訊</Text>
      </View>
    );
  }

  const imgFolder = card.imageFolder || `${card.series[0]}/`;
  const cardImg = card.imageUrl || `${imageUrl}${imgFolder}${card.cardNumber}_C.png`;

  const colorNames = (Array.isArray(card.color) ? card.color : [card.color].filter(Boolean))
    .map((c: string) => COLOR_MAP[c] || c);

  const seriesNames = (card.series || []).map((s: string) => SERIES_NAMES[s] || s);

  const rarity = card.grade === 'debut' ? 'C' :
    card.grade === '1st' ? 'U' :
      card.grade === '2nd' ? 'R' :
        card.grade === 'buzz' ? 'SR' : 'C';

  const openUrl = (url: string) => Linking.openURL(url);

  return (
    <ScrollView style={styles.container}>
      {/* 卡牌圖片 */}
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: cardImg }}
          style={styles.cardImage}
          resizeMode="contain"
        />
      </View>

      {/* 基本資訊 */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.cardNumber}>{card.cardNumber}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColors[rarity] }]}>
            <Text style={styles.rarityText}>{gradeLabels[card.grade] || card.grade}</Text>
          </View>
        </View>

        <Text style={styles.cardName}>{card.name}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>類型：</Text>
          <Text style={styles.metaValue}>{card.type === 'Member' ? '成員' : card.type === 'Oshi' ? '推し' : card.type}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>顏色：</Text>
          <Text style={styles.metaValue}>{colorNames.join(' / ') || '-'}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>系列：</Text>
          <Text style={styles.metaValue}>{seriesNames.join(' / ') || '-'}</Text>
        </View>

        {card.tags && card.tags.length > 0 && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tag：</Text>
            <Text style={styles.metaValue}>{card.tags.join(' / ')}</Text>
          </View>
        )}

        {card.effectType && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>效果類型：</Text>
            <Text style={styles.metaValue}>{card.effectType}</Text>
          </View>
        )}
      </View>

      {/* 搜尋關鍵字 */}
      {card.searchKeywords && card.searchKeywords.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>搜尋關鍵字</Text>
          <View style={styles.tagWrap}>
            {card.searchKeywords.map((kw: string, i: number) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{kw}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 卡牌效果 */}
      {card.versions && card.versions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>卡牌效果</Text>
          {card.searchKeywords.filter((kw: string, i: number) => i >= 3).map((kw: string, i: number) => (
            <Text key={i} style={styles.effectText}>"{kw}"</Text>
          ))}
        </View>
      )}

      {/* 外部連結 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>外部連結</Text>

        <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(card.officialUrl)}>
          <Text style={styles.linkText}>🏛️ 官方卡表搜尋</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(card.yuyuUrl)}>
          <Text style={styles.linkText}>🏪 遊々亭價格查詢</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(card.carousellUrl)}>
          <Text style={styles.linkText}>🔄 Carousell 二手查詢</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  imageWrap: {
    width: '100%',
    height: width * 0.6,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardImage: {
    width: width * 0.9,
    height: width * 0.55,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardNumber: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  rarityText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  cardName: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metaLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginRight: 6,
  },
  metaValue: {
    color: COLORS.text,
    fontSize: 14,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  effectText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  linkButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  linkText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
