import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { COLORS } from '../constants';

// Series quick access buttons
const SERIES_BUTTONS = [
  // Booster Packs
  { label: 'hBP01', query: 'hBP01' },
  { label: 'hBP02', query: 'hBP02' },
  { label: 'hBP03', query: 'hBP03' },
  { label: 'hBP04', query: 'hBP04' },
  { label: 'hBP05', query: 'hBP05' },
  { label: 'hBP06', query: 'hBP06' },
  { label: 'hBP07', query: 'hBP07' },
  // Starter Decks
  { label: 'hSD01', query: 'hSD01' },
  { label: 'hSD02', query: 'hSD02' },
  { label: 'hSD03', query: 'hSD03' },
  { label: 'hSD04', query: 'hSD04' },
  { label: 'hSD05', query: 'hSD05' },
  { label: 'hSD06', query: 'hSD06' },
  { label: 'hSD07', query: 'hSD07' },
  { label: 'hSD08', query: 'hSD08' },
  { label: 'hSD09', query: 'hSD09' },
  { label: 'hSD10', query: 'hSD10' },
  { label: 'hSD11', query: 'hSD11' },
  { label: 'hSD12', query: 'hSD12' },
  { label: 'hSD13', query: 'hSD13' },
  { label: 'hSD14', query: 'hSD14' },
  { label: 'hSD15', query: 'hSD15' },
  { label: 'hSD16', query: 'hSD16' },
  { label: 'hSD17', query: 'hSD17' },
  { label: 'hSD18', query: 'hSD18' },
  { label: 'hSD19', query: 'hSD19' },
  // Special & Promo
  { label: 'hPR', query: 'hPR' },
  { label: 'hY', query: 'hY' },
  { label: 'ent07', query: 'ent07' },
];

// Color quick access buttons
const COLOR_BUTTONS = [
  { label: '白', query: '白色', color: '#ffffff' },
  { label: '青', query: '藍色', color: '#3b82f6' },
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

      {/* Series Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>シリーズ</Text>
        <View style={styles.seriesGrid}>
          {SERIES_BUTTONS.map((btn) => (
            <TouchableOpacity
              key={btn.query}
              style={styles.seriesBtn}
              onPress={() => navigation.navigate('SearchResults', { query: btn.query })}
              activeOpacity={0.7}
            >
              <Text style={styles.seriesBtnText}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Color Section */}
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
  seriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seriesBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#333333',
  },
  seriesBtnText: { color: '#cccccc', fontSize: 13, fontWeight: '500', letterSpacing: 1 },
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
