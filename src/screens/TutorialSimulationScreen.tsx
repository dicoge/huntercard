import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import simulationPhases from '../data/tutorialSimulationData';
import SimulationBoard from '../components/tutorial/SimulationBoard';
import SimulationStepCard from '../components/tutorial/SimulationStepCard';

export default function TutorialSimulationScreen({ navigation }: any) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentPhase = simulationPhases[currentPhaseIndex];
  const currentStep = currentPhase.steps[currentStepIndex];
  const isFirstPhase = currentPhaseIndex === 0;
  const isLastPhase = currentPhaseIndex === simulationPhases.length - 1;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === currentPhase.steps.length - 1;

  const handleNext = useCallback(() => {
    if (!isLastStep) {
      // Move to next step in same phase
      setCurrentStepIndex((prev) => prev + 1);
    } else if (!isLastPhase) {
      // Move to next phase, first step
      setCurrentPhaseIndex((prev) => prev + 1);
      setCurrentStepIndex(0);
    } else {
      // Last step of last phase — finish simulation
      navigation.goBack();
    }
  }, [isLastStep, isLastPhase, navigation]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      // Go back to previous step in same phase
      setCurrentStepIndex((prev) => prev - 1);
    } else if (!isFirstPhase) {
      // Go back to previous phase, last step
      setCurrentPhaseIndex((prev) => prev - 1);
      const prevPhase = simulationPhases[currentPhaseIndex - 1];
      setCurrentStepIndex(prevPhase.steps.length - 1);
    }
  }, [isFirstStep, isFirstPhase, currentPhaseIndex]);

  // Calculate overall progress
  const totalSteps = simulationPhases.reduce(
    (sum, phase) => sum + phase.steps.length,
    0
  );
  const stepsDone = simulationPhases
    .slice(0, currentPhaseIndex)
    .reduce((sum, phase) => sum + phase.steps.length, 0) + currentStepIndex;
  const progressPercent = ((stepsDone) / (totalSteps - 1)) * 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>🎮 模擬實戰</Text>
        <Text style={styles.topBarSub}>跟著步驟體驗一場對局</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(progressPercent, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          階段 {currentPhaseIndex + 1}/{simulationPhases.length}
        </Text>
      </View>

      {/* Game Board — top portion */}
      <View style={styles.boardContainer}>
        <SimulationBoard
          highlightZone={currentStep.highlightZone}
          cardRef={currentStep.cardRef}
        />
      </View>

      {/* Step Card — bottom portion */}
      <View style={styles.cardContainer}>
        <SimulationStepCard
          step={currentStep}
          phaseTitle={currentPhase.title}
          phaseIcon={currentPhase.icon}
          totalStepsInPhase={currentPhase.steps.length}
          onNext={handleNext}
          onPrev={handlePrev}
          isFirst={isFirstStep}
          isLast={isLastStep}
          isFirstPhase={isFirstPhase}
          isLastPhase={isLastPhase}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topBarTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  topBarSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  boardContainer: {
    flex: 4.5,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  cardContainer: {
    flex: 5.5,
    justifyContent: 'flex-start',
  },
});