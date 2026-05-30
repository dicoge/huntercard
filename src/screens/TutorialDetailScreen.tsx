import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { TutorialSection } from '../data/tutorialData';
import TutorialCard from '../components/tutorial/TutorialCard';
import TutorialPhaseCard from '../components/tutorial/TutorialPhaseCard';
import TutorialImageView from '../components/tutorial/TutorialImageView';

interface TutorialDetailScreenProps {
  route: { params: { section: TutorialSection } };
  navigation: any;
}

export default function TutorialDetailScreen({ route, navigation }: TutorialDetailScreenProps) {
  const { section } = route.params;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>{section.icon}</Text>
          <Text style={styles.headerTitle}>{section.title}</Text>
        </View>

        {/* Description */}
        {section.description && (
          <TutorialCard>
            <Text style={styles.description}>{section.description}</Text>
          </TutorialCard>
        )}

        {/* Main images */}
        {section.images && section.images.length > 0 && (
          <TutorialCard>
            {section.images.map((img, index) => (
              <TutorialImageView key={`img-${index}`} uri={img.url} alt={img.alt} />
            ))}
          </TutorialCard>
        )}

        {/* Content items (for lists like field regions) */}
        {section.items && section.items.length > 0 && (
          <TutorialCard>
            {section.items.map((item, index) => (
              <View key={`item-${index}`} style={styles.itemRow}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
              </View>
            ))}
          </TutorialCard>
        )}

        {/* Content (simple text list) */}
        {section.content && section.content.length > 0 && (
          <TutorialCard>
            {section.content.map((text, index) => (
              <View key={`content-${index}`} style={styles.contentRow}>
                <Text style={styles.contentText}>{text}</Text>
              </View>
            ))}
          </TutorialCard>
        )}

        {/* Phases / Sub-sections */}
        {section.phases && section.phases.length > 0 && (
          <View>
            {section.phases.map((phase, index) => (
              <TutorialCard key={`phase-${index}`}>
                {/* Phase images */}
                {phase.images && phase.images.length > 0 && (
                  <View style={styles.phaseImages}>
                    {phase.images.map((img, idx) => (
                      <TutorialImageView key={`phase-img-${idx}`} uri={img.url} alt={img.alt} />
                    ))}
                  </View>
                )}
                <TutorialPhaseCard 
                  phase={phase} 
                  defaultExpanded={true}
                />
              </TutorialCard>
            ))}
          </View>
        )}

        {/* Links */}
        {section.links && section.links.length > 0 && (
          <TutorialCard>
            <Text style={styles.linksTitle}>🔗 參考連結</Text>
            {section.links.map((link, index) => (
              <TouchableOpacity
                key={`link-${index}`}
                style={styles.linkButton}
                onPress={() => Linking.openURL(link.url)}
                activeOpacity={0.7}
              >
                <Text style={styles.linkIcon}>🌐</Text>
                <Text style={styles.linkText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </TutorialCard>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            資料來源：巴哈姆特論壇 — 桜雪 (h503323)
          </Text>
          <Text style={styles.footerDate}>更新：2026 年 4 月 24 日</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemLabel: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
    width: 80,
    marginRight: 8,
  },
  itemDesc: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  contentRow: {
    marginBottom: 10,
    paddingVertical: 4,
  },
  contentText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  phaseImages: {
    marginBottom: 8,
  },
  linksTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  linkIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  footerDate: {
    color: COLORS.textSecondary,
    fontSize: 11,
    opacity: 0.7,
  },
});