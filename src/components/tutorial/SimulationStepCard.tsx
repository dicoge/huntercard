import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants';
import { SimulationStep } from '../../data/tutorialSimulationData';

interface SimulationStepCardProps {
  step: SimulationStep;
  phaseTitle: string;
  phaseIcon: string;
  totalStepsInPhase: number;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
  isFirstPhase: boolean;
  isLastPhase: boolean;
}

export default function SimulationStepCard({
  step,
  phaseTitle,
  phaseIcon,
  totalStepsInPhase,
  onNext,
  onPrev,
  isFirst,
  isLast,
  isFirstPhase,
  isLastPhase,
}: SimulationStepCardProps) {
  return (
    <View style={styles.container}>
      {/* Phase indicator */}
      <View style={styles.phaseBar}>
        <Text style={styles.phaseIcon}>{phaseIcon}</Text>
        <Text style={styles.phaseTitle}>{phaseTitle}</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            步驟 {step.stepNumber}/{totalStepsInPhase}
          </Text>
        </View>
      </View>

      {/* Step title */}
      <Text style={styles.stepTitle}>{step.title}</Text>

      {/* Step description */}
      <Text style={styles.description}>{step.description}</Text>

      {/* Action label (visual illustration of the action) */}
      {step.actionLabel && (
        <View style={styles.actionBox}>
          <Text style={styles.actionEmoji}>
            {step.phaseId === 'setup' ? '🎮' :
             step.phaseId === 'reset' ? '🔄' :
             step.phaseId === 'draw' ? '📚' :
             step.phaseId === 'cheer' ? '📣' :
             step.phaseId === 'main' ? '⚡' :
             step.phaseId === 'performance' ? '🎭' :
             '🏁'}
          </Text>
          <Text style={styles.actionText}>{step.actionLabel}</Text>
        </View>
      )}

      {/* Explanation */}
      {step.explanation && (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationIcon}>💡</Text>
          <Text style={styles.explanationText}>{step.explanation}</Text>
        </View>
      )}

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {!isFirst || !isFirstPhase ? (
          <TouchableOpacity
            style={styles.prevButton}
            onPress={onPrev}
            activeOpacity={0.7}
          >
            <Text style={styles.prevArrow}>←</Text>
            <Text style={styles.prevText}>上一步</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}

        <TouchableOpacity
          style={styles.nextButton}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextText}>
            {isLast && isLastPhase ? '🎉 完成模擬' : '下一步 →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  phaseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  phaseIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  phaseTitle: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  stepBadge: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '18',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  actionEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  actionText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.secondary + '18',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  explanationIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 1,
  },
  explanationText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    fontStyle: 'italic',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
  },
  prevArrow: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginRight: 4,
  },
  prevText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  spacer: {
    width: 1,
  },
});