import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { COLORS } from '../../constants';
import { SimulationCardRef } from '../../data/tutorialSimulationData';

interface ZoneConfig {
  id: string;
  label: string;
  shortLabel: string;
  gridArea: string; // CSS-like grid placement hint
}

const ZONES: ZoneConfig[] = [
  { id: 'oshi', label: '主推位置', shortLabel: '主推', gridArea: 'topLeft' },
  { id: 'center', label: '中心位置', shortLabel: '中心', gridArea: 'topCenter' },
  { id: 'collab', label: '聯動位置', shortLabel: '聯動', gridArea: 'topRight' },
  { id: 'backstage', label: '舞台後方', shortLabel: '後台', gridArea: 'midLeft' },
  { id: 'deck', label: '牌組', shortLabel: '牌組', gridArea: 'midCenter' },
  { id: 'energy', label: '能量區', shortLabel: '能量', gridArea: 'midRight' },
  { id: 'life', label: '生命區', shortLabel: '生命', gridArea: 'botLeft' },
  { id: 'cheerDeck', label: '吶喊牌組', shortLabel: '吶喊', gridArea: 'botCenter' },
  { id: 'archive', label: '存檔區', shortLabel: '存檔', gridArea: 'botRight' },
];

interface SimulationBoardProps {
  highlightZone?: string;
  cardRef?: SimulationCardRef;
}

export default function SimulationBoard({ highlightZone, cardRef }: SimulationBoardProps) {
  const screenWidth = Dimensions.get('window').width;
  const boardWidth = screenWidth - 32; // 16px padding each side

  // Determine which zone the cardRef belongs to
  const getCardZone = (): string | null => {
    if (!cardRef) return null;
    // Map card names to zones
    if (cardRef.name.includes('推し')) return 'oshi';
    if (cardRef.name.includes('ホロメン')) return 'backstage';
    return null;
  };

  const cardZone = getCardZone();

  return (
    <View style={styles.container}>
      <Text style={styles.boardTitle}>🎮 遊戲盤面</Text>

      {/* 2x5 grid layout for the game board */}
      <View style={[styles.grid, { width: boardWidth }]}>
        {/* Row 1: Oshi | Center | Collab */}
        <View style={styles.row}>
          <ZoneBox
            zone={ZONES[0]}
            isHighlighted={highlightZone === 'oshi' || cardZone === 'oshi'}
            cardRef={cardZone === 'oshi' ? cardRef : undefined}
          />
          <ZoneBox
            zone={ZONES[1]}
            isHighlighted={highlightZone === 'center' || cardZone === 'center'}
            cardRef={cardZone === 'center' ? cardRef : undefined}
          />
          <ZoneBox
            zone={ZONES[2]}
            isHighlighted={highlightZone === 'collab' || cardZone === 'collab'}
            cardRef={cardZone === 'collab' ? cardRef : undefined}
          />
        </View>

        {/* Row 2: Backstage | Deck | Energy */}
        <View style={styles.row}>
          <ZoneBox
            zone={ZONES[3]}
            isHighlighted={highlightZone === 'backstage' || cardZone === 'backstage'}
            cardRef={cardZone === 'backstage' ? cardRef : undefined}
          />
          <ZoneBox
            zone={ZONES[4]}
            isHighlighted={highlightZone === 'deck' || cardZone === 'deck'}
            cardRef={cardZone === 'deck' ? cardRef : undefined}
          />
          <ZoneBox
            zone={ZONES[5]}
            isHighlighted={highlightZone === 'energy' || cardZone === 'energy'}
            cardRef={cardZone === 'energy' ? cardRef : undefined}
          />
        </View>

        {/* Row 3: Life | CheerDeck | Archive */}
        <View style={styles.row}>
          <ZoneBox
            zone={ZONES[6]}
            isHighlighted={highlightZone === 'life' || cardZone === 'life'}
            cardRef={cardZone === 'life' ? cardRef : undefined}
          />
          <ZoneBox
            zone={ZONES[7]}
            isHighlighted={highlightZone === 'cheerDeck' || cardZone === 'cheerDeck'}
            cardRef={cardZone === 'cheerDeck' ? cardRef : undefined}
          />
          <ZoneBox
            zone={ZONES[8]}
            isHighlighted={highlightZone === 'archive' || cardZone === 'archive'}
            cardRef={cardZone === 'archive' ? cardRef : undefined}
          />
        </View>
      </View>
    </View>
  );
}

interface ZoneBoxProps {
  zone: ZoneConfig;
  isHighlighted: boolean;
  cardRef?: SimulationCardRef;
}

function ZoneBox({ zone, isHighlighted, cardRef }: ZoneBoxProps) {
  return (
    <View
      style={[
        styles.zone,
        isHighlighted && styles.zoneHighlighted,
      ]}
    >
      {/* Card thumbnail if available */}
      {cardRef && cardRef.imageUrl ? (
        <Image
          source={{ uri: cardRef.imageUrl }}
          style={styles.cardThumb}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.zoneInner}>
          <Text style={styles.zoneEmoji}>
            {zone.id === 'oshi' ? '⭐' :
             zone.id === 'center' ? '🎯' :
             zone.id === 'collab' ? '🔗' :
             zone.id === 'backstage' ? '🎪' :
             zone.id === 'deck' ? '📚' :
             zone.id === 'energy' ? '⚡' :
             zone.id === 'life' ? '❤️' :
             zone.id === 'cheerDeck' ? '📣' :
             zone.id === 'archive' ? '📦' : '🃏'}
          </Text>
        </View>
      )}
      <Text style={[styles.zoneLabel, isHighlighted && styles.zoneLabelHighlighted]}>
        {zone.shortLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  boardTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 1,
  },
  grid: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  zone: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  zoneHighlighted: {
    borderColor: COLORS.primary,
    borderWidth: 2.5,
    backgroundColor: COLORS.surfaceLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  zoneInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoneEmoji: {
    fontSize: 22,
  },
  cardThumb: {
    width: '80%',
    height: '80%',
    borderRadius: 6,
  },
  zoneLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '600',
    position: 'absolute',
    bottom: 4,
    textAlign: 'center',
  },
  zoneLabelHighlighted: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});