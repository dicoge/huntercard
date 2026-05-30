import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import tutorialData from '../data/tutorialData';

export default function TutorialScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>📚</Text>
          <Text style={styles.heroTitle}>規則教學</Text>
          <Text style={styles.heroSub}>hOCG 完全攻略</Text>
        </View>

        {/* Description */}
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            這是一款以「共同創造、共同競爭」為概念的集換式卡牌遊戲。
            玩家們將化身粉絲，與主推以及其他 holo 成員一同打造屬於自己的舞台。
          </Text>
          <Text style={styles.introText}>
            一起為 holo 成員加油，並以「hololive 極限大賽」的頂點為目標！
          </Text>
          <View style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>📝 來源：</Text>
            <Text style={styles.sourceValue}>巴哈姆特 — 桜雪</Text>
          </View>
        </View>

        {/* Category Grid */}
        <View style={styles.grid}>
          {tutorialData.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('TutorialDetail', { section })}
              activeOpacity={0.7}
            >
              <View style={styles.categoryIconWrap}>
                <Text style={styles.categoryIcon}>{section.icon}</Text>
              </View>
              <Text style={styles.categoryTitle}>{section.title}</Text>
              <Text style={styles.categoryDesc} numberOfLines={2}>
                {section.description || (
                  section.phases ? `共 ${section.phases.length} 個章節` : 
                  section.items ? `${section.items.length} 個區域說明` : 
                  '點擊查看詳情'
                )}
              </Text>
              <View style={styles.arrowRow}>
                <Text style={styles.arrowText}>開始學習</Text>
                <Text style={styles.arrow}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Simulation Entry Card */}
        <TouchableOpacity
          style={styles.simulationCard}
          onPress={() => navigation.navigate('TutorialSimulation')}
          activeOpacity={0.7}
        >
          <View style={styles.simulationIconWrap}>
            <Text style={styles.simulationEmoji}>🎮</Text>
          </View>
          <View style={styles.simulationContent}>
            <Text style={styles.simulationTitle}>實戰模擬</Text>
            <Text style={styles.simulationDesc}>
              跟著 step-by-step 引導，體驗一場簡化的 hOCG 對局
            </Text>
          </View>
          <Text style={styles.simulationArrow}>→</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>hololive OFFICIAL CARD GAME</Text>
          <Text style={styles.footerSub}>hOCG 規則教學</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 8,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  heroSub: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 3,
    marginTop: 6,
  },
  introCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  introText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sourceLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  sourceValue: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    gap: 14,
  },
  categoryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
  },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 26,
  },
  categoryTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  categoryDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  arrow: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  footerTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  footerSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  // Simulation entry card styles
  simulationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  simulationIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  simulationEmoji: {
    fontSize: 28,
  },
  simulationContent: {
    flex: 1,
  },
  simulationTitle: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  simulationDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  simulationArrow: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
});