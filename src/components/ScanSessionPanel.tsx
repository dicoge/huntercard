/**
 * ScanSessionPanel — 掃描估值面板
 * 累計掃描的卡牌清單與總價值，支援展開/收起
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useScanSessionStore, SessionCard } from '../stores/scanSessionStore';
import { COLORS } from '../constants';

interface ScanSessionPanelProps {
  onContinueScanning?: () => void;
  onViewCard?: (card: SessionCard) => void;
}

export default function ScanSessionPanel({ onContinueScanning, onViewCard }: ScanSessionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { cards, totalValue, cardCount, removeCard, clearSession } = useScanSessionStore();

  if (cardCount === 0 && !expanded) return null;

  const formatPrice = (price: number | null) => {
    if (!price || price === 0) return '—';
    return `¥${price.toLocaleString()}`;
  };

  return (
    <View style={styles.container}>
      {/* Collapsed Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>📋</Text>
          <Text style={styles.headerText}>
            {cardCount > 0
              ? `已掃描 ${cardCount} 張卡牌`
              : '掃描估值清單'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {cardCount > 0 && (
            <>
              <Text style={styles.totalPrice}>
                {totalValue > 0 ? `¥${totalValue.toLocaleString()}` : '——'}
              </Text>
              <Text style={styles.expandArrow}>{expanded ? '▼' : '▲'}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded List */}
      {expanded && (
        <View style={styles.expandedBody}>
          {cardCount === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>尚未掃描任何卡牌</Text>
              <Text style={styles.emptyHint}>點擊「掃描」按鈕開始加入卡牌</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.cardList} nestedScrollEnabled>
                {cards.map((card, index) => (
                  <View key={`${card.id}-${index}`} style={styles.cardRow}>
                    <TouchableOpacity
                      style={styles.cardInfo}
                      onPress={() => onViewCard?.(card)}
                    >
                      <Text style={styles.cardIndex}>#{index + 1}</Text>
                      <View style={styles.cardDetails}>
                        <Text style={styles.cardName} numberOfLines={1}>
                          {card.name}
                        </Text>
                        <Text style={styles.cardMeta}>
                          {card.id} · {formatPrice(card.sellPrice)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeCard(card.id)}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* Total + Actions */}
              <View style={styles.footer}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>總計</Text>
                  <Text style={styles.totalValue}>
                    {formatPrice(totalValue)}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  {cardCount > 0 && (
                    <>
                      {onContinueScanning && (
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={onContinueScanning}
                        >
                          <Text style={styles.actionBtnText}>📸 繼續掃描</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.shareBtn]}
                        onPress={() => {
                          // Share/export — build text summary
                          const summary = cards.map((c, i) =>
                            `${i + 1}. ${c.name} (${c.id}) — ${formatPrice(c.sellPrice)}`
                          ).join('\n');
                          const full = `📋 掃描估值結果\n━━━━━━━━━━━━\n${summary}\n━━━━━━━━━━━━\n總計: ${formatPrice(totalValue)}`;
                          // Trigger native share
                          if (Platform.OS === 'web') {
                            navigator.clipboard?.writeText(full);
                            alert('已複製到剪貼簿！');
                          }
                        }}
                      >
                        <Text style={styles.shareBtnText}>📋 複製結果</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.clearBtn]}
                        onPress={clearSession}
                      >
                        <Text style={styles.clearBtnText}>🗑️ 清除</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: 'rgba(20, 20, 40, 0.95)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  totalPrice: {
    color: '#00C853',
    fontSize: 18,
    fontWeight: 'bold',
  },
  expandArrow: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  expandedBody: {
    maxHeight: 350,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: 8,
  },
  emptyHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  cardList: {
    maxHeight: 200,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIndex: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    width: 24,
  },
  cardDetails: {
    flex: 1,
  },
  cardName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  cardMeta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#00C853',
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  actionBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  shareBtn: {
    backgroundColor: COLORS.primary,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  clearBtn: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
  },
  clearBtnText: {
    color: '#FF5252',
    fontSize: 13,
    fontWeight: '600',
  },
});