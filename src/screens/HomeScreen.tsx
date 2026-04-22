import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../constants';

// Series quick access buttons
const SERIES_BUTTONS = [
  { label: 'hBP01', query: 'hBP01' },
  { label: 'hBP02', query: 'hBP02' },
  { label: 'hBP03', query: 'hBP03' },
  { label: 'hBP04', query: 'hBP04' },
  { label: 'hBP05', query: 'hBP05' },
  { label: 'hBP06', query: 'hBP06' },
  { label: 'hBP07', query: 'hBP07' },
];

// Color quick access buttons
const COLOR_BUTTONS = [
  { label: '⚪ 白', query: '白色', color: '#ffffff' },
  { label: '🔵 青', query: '藍色', color: '#3b82f6' },
  { label: '🟢 緑', query: '綠色', color: '#10b981' },
  { label: '🔴 赤', query: '紅色', color: '#ef4444' },
  { label: '🟣 紫', query: '紫色', color: '#8b5cf6' },
  { label: '🟡 黄', query: '黃色', color: '#f59e0b' },
];

export default function HomeScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌸 HoloHunter</Text>
        <Text style={styles.subtitle}>hololive TCG 卡牌查詢工具</Text>
      </View>

      {/* Search Input */}
      <TouchableOpacity
        style={styles.searchPrompt}
        onPress={() => navigation.navigate('Search')}
        activeOpacity={0.7}
      >
        <Text style={styles.searchPromptText}>🔍 輸入卡號或成員名稱搜尋</Text>
      </TouchableOpacity>

      {/* Series Quick Access */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 系列搜尋</Text>
        <View style={styles.buttonRow}>
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

      {/* Color Quick Access */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 顏色搜尋</Text>
        <View style={styles.buttonRow}>
          {COLOR_BUTTONS.map((btn) => (
            <TouchableOpacity
              key={btn.query}
              style={[styles.colorBtn, { borderColor: btn.color }]}
              onPress={() => navigation.navigate('SearchResults', { query: btn.query })}
              activeOpacity={0.7}
            >
              <Text style={[styles.colorBtnText, { color: btn.color }]}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
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
  section: { marginBottom: 24 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seriesBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  seriesBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  colorBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 2,
  },
  colorBtnText: { fontSize: 14, fontWeight: '600' },
});
