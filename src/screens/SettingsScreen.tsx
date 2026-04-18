import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, APP_NAME, APP_VERSION } from '../constants';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
      <Text style={styles.version}>版本 {APP_VERSION}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>設定</Text>
        <Text style={styles.item}>🌸 主題：深藍 + 粉紅（hololive 風格）</Text>
        <Text style={styles.item}>💰 幣別：新台幣 (TWD)</Text>
        <Text style={styles.item}>🔍 預設分類：hololive</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>價格來源</Text>
        <Text style={styles.item}>🏪 遊々亭（日本二手卡牌）</Text>
        <Text style={styles.item}>🔄 Carousell（旋轉拍賣）</Text>
      </View>
      
      <Text style={styles.footer}>專為 hololive PCG 玩家打造</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  title: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 20,
  },
  version: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 30,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  item: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    paddingLeft: 8,
  },
  footer: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
});
