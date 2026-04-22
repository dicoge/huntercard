import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../constants';

// Booster Packs (ブースターパック)
const BOOSTER_PACKS = [
  { label: 'hBP01', query: 'hBP01', name: 'ブルーミングレディアンス' },
  { label: 'hBP02', query: 'hBP02', name: 'クインテットスペクトラム' },
  { label: 'hBP03', query: 'hBP03', name: 'サバイバル・オブ・ザ・フェイビアス' },
  { label: 'hBP04', query: 'hBP04', name: 'キュリアスユニバース' },
  { label: 'hBP05', query: 'hBP05', name: 'エンチャントレガリア' },
  { label: 'hBP06', query: 'hBP06', name: 'アヤカシヴァーミリオン' },
  { label: 'hBP07', query: 'hBP07', name: 'ディーヴァフィーバー' },
];

// Starter Decks (スタートデッキ)
const STARTER_DECKS = [
  { label: 'hSD01', query: 'hSD01', name: 'ときのそら' },
  { label: 'hSD02', query: 'hSD02', name: '白上フブキ' },
  { label: 'hSD03', query: 'hSD03', name: '湊あくあ' },
  { label: 'hSD04', query: 'hSD04', name: '天音かなた' },
  { label: 'hSD05', query: 'hSD05', name: 'ReGLOSS' },
  { label: 'hSD06', query: 'hSD06', name: '風真いろは' },
  { label: 'hSD07', query: 'hSD07', name: '癒月ちょこ' },
  { label: 'hSD08', query: 'hSD08', name: '轟はじめ' },
  { label: 'hSD09', query: 'hSD09', name: '宝鐘マリン' },
  { label: 'hSD10', query: 'hSD10', name: '輪堂千速' },
  { label: 'hSD11', query: 'hSD11', name: '虎金妃笑虎' },
  { label: 'hSD12', query: 'hSD12', name: '推し Advent' },
  { label: 'hSD13', query: 'hSD13', name: '推し Justice' },
  { label: 'hSD14', query: 'hSD14', name: '白上フブキ' },
  { label: 'hSD15', query: 'hSD15', name: '儒烏風亭らでん' },
  { label: 'hSD16', query: 'hSD16', name: 'さくらみこ' },
  { label: 'hSD17', query: 'hSD17', name: '星街すいせい' },
  { label: 'hSD18', query: 'hSD18', name: '森カリオペ' },
  { label: 'hSD19', query: 'hSD19', name: '大空スバル' },
];

// Special & Promo (特殊・PR)
const SPECIAL = [
  { label: 'hPR', query: 'hPR', name: 'PRカード' },
  { label: 'hY', query: 'hY', name: 'Yokohama Promo' },
  { label: 'ent07', query: 'ent07', name: 'ディーヴァフィーバーEC' },
  { label: 'hCS01', query: 'hCS01', name: '1st Anniversary' },
  { label: 'hPC01', query: 'hPC01', name: 'オフィシャルコレクション' },
  { label: 'hSD2025summer', query: 'hSD2025summer', name: 'ホロナツパラダイス' },
];

// Color quick access buttons
const COLOR_BUTTONS = [
  { label: '白', query: '白色', color: '#ffffff' },
  { label: '青', query: '青色', color: '#3b82f6' },
  { label: '緑', query: '綠色', color: '#10b981' },
  { label: '赤', query: '紅色', color: '#ef4444' },
  { label: '紫', query: '紫色', color: '#8b5cf6' },
  { label: '黄', query: '黃色', color: '#f59e0b' },
];

export default function HomeScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>hololive OFFICIAL CARD GAME</Text>
        <Text style={styles.heroSub}>卡牌查詢</Text>
      </View>

      {/* Search Input */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate('Search')}
        activeOpacity={0.7}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>卡號或成員名稱...</Text>
      </TouchableOpacity>

      {/* Booster Packs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ブースターパック</Text>
        <View style={styles.cardGrid}>
          {BOOSTER_PACKS.map((item) => (
            <TouchableOpacity
              key={item.query}
              style={styles.cardBtn}
              onPress={() => navigation.navigate('SearchResults', { query: item.query })}
              activeOpacity={0.7}
            >
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Starter Decks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>スタートデッキ</Text>
        <View style={styles.cardGrid}>
          {STARTER_DECKS.map((item) => (
            <TouchableOpacity
              key={item.query}
              style={styles.cardBtn}
              onPress={() => navigation.navigate('SearchResults', { query: item.query })}
              activeOpacity={0.7}
            >
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Special & Promo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>特殊・PR</Text>
        <View style={styles.cardGrid}>
          {SPECIAL.map((item) => (
            <TouchableOpacity
              key={item.query}
              style={styles.cardBtn}
              onPress={() => navigation.navigate('SearchResults', { query: item.query })}
              activeOpacity={0.7}
            >
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Color Search */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>カラー</Text>
        <View style={styles.colorGrid}>
          {COLOR_BUTTONS.map((btn) => (
            <TouchableOpacity
              key={btn.query}
              style={[styles.colorBtn, { backgroundColor: btn.color + '15', borderColor: btn.color }]}
              onPress={() => navigation.navigate('SearchResults', { query: btn.query })}
              activeOpacity={0.7}
            >
              <View style={[styles.colorDot, { backgroundColor: btn.color }]} />
              <Text style={[styles.colorBtnText, { color: btn.color }]}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  hero: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSub: {
    color: '#666666',
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333333',
  },
  searchIcon: { fontSize: 16, marginRight: 12 },
  searchPlaceholder: { color: '#666666', fontSize: 14 },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  sectionTitle: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#333333',
    width: '31%',
  },
  cardLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardName: {
    color: '#666666',
    fontSize: 10,
    fontWeight: '400',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 8,
  },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  colorBtnText: { fontSize: 13, fontWeight: '500', letterSpacing: 1 },
});
