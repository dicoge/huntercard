import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Image, Dimensions } from 'react-native';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');
const CARD_IMG_BASE = 'https://tetsunekko.github.io/holotcgtw/cards/';

const gradeLabels: Record<string, string> = {
  debut: 'Debut',
  '1st': '1st',
  '2nd': '2nd',
  buzz: 'Buzz',
  spot: 'Spot',
};

const rarityColors: Record<string, string> = {
  N: '#6b7280', C: '#6b7280', U: '#10b981', R: '#3b82f6', SR: '#f59e0b',
};

const COLOR_MAP: Record<string, string> = {
  white: '白色', blue: '藍色', green: '綠色', red: '紅色',
  purple: '紫色', yellow: '黃色', colorless: '無色',
};

const SERIES_NAMES: Record<string, string> = {
  hBP01: 'ブルーミングレディアンス', hBP02: 'クインテットスペクトラム',
  hBP03: 'サバイバル・オブ・ザ・フェイビアス',
  hSD01: 'スターターデッキ ときのそら', hSD02: 'スターターデッキ 白上フブキ',
  hSD03: 'スターターデッキ 湊あくあ', hSD04: 'スターターデッキ 天音かなた',
  hSD05: 'スターターデッキ ReGLOSS', hSD06: 'スターターデッキ 風真いろは',
  hSD07: 'スターターデッキ 癒月ちょこ',
  hPR: 'Promo', hBD24: 'Bandai Distribution 2024', hY: 'Yokohama Promo',
};

export default function CardDetailScreen({ route, navigation }: any) {
  const { card } = route.params;
  const [imageError, setImageError] = useState(false);

  if (!card) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.text }}>無法載入卡牌資訊</Text>
      </View>
    );
  }

  const imgFolder = card.imageFolder || '';
  const ver = (card.versions && card.versions.length > 0) ? card.versions[0] : '_C.png';
  const cardImageUrl = card.imageUrl || `${CARD_IMG_BASE}${imgFolder}${card.cardNumber}${ver}`;

  const rawColors = card.colors || card.color || [];
  const colorArr = Array.isArray(rawColors) ? rawColors : [rawColors];
  const colorNames = colorArr.filter(Boolean).map((c: string) => COLOR_MAP[c] || c).filter(Boolean);

  const seriesNames = (card.series || []).map((s: string) => SERIES_NAMES[s] || s);

  const rarity = card.grade === 'debut' ? 'C' :
    card.grade === '1st' ? 'U' :
      card.grade === '2nd' ? 'R' :
        card.grade === 'buzz' ? 'SR' : 'N';

  const typeLabel = card.type === 'Member' ? '成員' : card.type === 'Oshi' ? '推し' : card.type;

  // Effects: keywords from index 3 onwards (name + JP + EN = first 3)
  const effectTexts = (card.searchKeywords || []).filter((kw: string, i: number) => i >= 3);

  // Chinese description from keywords (usually index 1 or index 3+)
  const chineseNames = card.searchKeywords?.filter((kw: string, i: number) => i === 1) || [];

  const openUrl = (url: string) => Linking.openURL(url);

  return (
    <ScrollView style={styles.container}>
      {/* 卡牌圖片 */}
      <View style={styles.imageWrap}>
        {!imageError ? (
          <Image
            source={{ uri: cardImageUrl }}
            style={styles.cardImage}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderRarity}>{gradeLabels[card.grade] || card.grade}</Text>
            <Text style={styles.placeholderName}>{card.name}</Text>
          </View>
        )}
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

        {effectTexts.length === 0 && card.effectType && (
          <Text style={styles.effectLabel}>「{card.effectType}」</Text>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>類型：</Text>
          <Text style={styles.metaValue}>{typeLabel}</Text>
        </View>

        {colorNames.length > 0 && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>顏色：</Text>
            <Text style={styles.metaValue}>{colorNames.join(' / ')}</Text>
          </View>
        )}

        {seriesNames.length > 0 && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>系列：</Text>
            <Text style={styles.metaValue}>{seriesNames.join(' / ')}</Text>
          </View>
        )}

        {card.tags && card.tags.length > 0 && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tag：</Text>
            <Text style={styles.metaValue}>{card.tags.join(' / ')}</Text>
          </View>
        )}
      </View>

      {/* 搜尋關鍵字 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>搜尋關鍵字</Text>
        <View style={styles.tagWrap}>
          {(card.searchKeywords || []).slice(0, 3).map((kw: string, i: number) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{kw}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 卡牌效果 */}
      {effectTexts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>卡牌效果</Text>
          {effectTexts.map((kw: string, i: number) => (
            <Text key={i} style={styles.effectText}>
              <Text style={styles.effectIndex}>[效果 {i + 1}]</Text>{'\n'}{kw}
            </Text>
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
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderRarity: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: 8,
  },
  placeholderName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
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
    marginBottom: 6,
  },
  effectLabel: {
    color: COLORS.primary,
    fontSize: 14,
    fontStyle: 'italic',
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
    marginBottom: 10,
  },
  effectIndex: {
    color: COLORS.primary,
    fontWeight: '600',
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
