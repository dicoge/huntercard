import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Dimensions, Platform } from 'react-native';
import { COLORS } from '../constants';

const { width, height } = Dimensions.get('window');
const IFRAME_HEIGHT = height * 0.55;

const gradeLabels: Record<string, string> = { debut: 'Debut', '1st': '1st', '2nd': '2nd', buzz: 'Buzz', spot: 'Spot' };
const typeLabels: Record<string, string> = { Oshi: '推し（主推卡）', Member: '成員', Support: '支援', Energy: '能量' };
const rarityColors: Record<string, string> = { N: '#6b7280', C: '#6b7280', U: '#10b981', R: '#3b82f6', SR: '#f59e0b' };

function parseEffects(keywords: string[] = []): string[] {
  return keywords.slice(3).filter((kw: string) => {
    const t = kw.trim();
    if (t.length < 8) return false;
    const gameTerms = ['給予', '抽', '傷害', '牌組', '手札', '成員', '中央', '藝能', 'HP', '生命', '階段', '回合', '特殊', '公開', '聯動', '擊倒', '剩餘', '持有', '超過', '以下', '以上', '最多', '技能', '備', '附於', '丟擲', '子', '奇數', '偶數', '回復', '存檔', '聲援', '舞台'];
    return gameTerms.some(term => t.includes(term));
  });
}

export default function CardDetailScreen({ route, navigation }: any) {
  const { card } = route.params;
  const [showInfo, setShowInfo] = useState(!card);

  if (!card) return <View style={styles.center}><Text style={{ color: COLORS.text }}>無法載入</Text></View>;

  const id = card.cardNumber || card.id;
  const allKW = card.searchKeywords || [];
  const nameJP = allKW[0] || '';
  const nameTW = allKW[1] || '';
  const nameEN = allKW[2] || '';
  const effects = card.effects || parseEffects(allKW);
  const colorNames = card.colorNames || [];
  const rarityKey = card.grade && ['debut', '1st', '2nd', 'buzz'].includes(card.grade) ?
    (card.grade === 'debut' ? 'C' : card.grade === '1st' ? 'U' : card.grade === '2nd' ? 'R' : 'SR') : 'N';
  const typeLabel = typeLabels[card.type] || card.type || '-';
  const openUrl = (url: string) => Linking.openURL(url);

  // 官方卡牌搜尋結果頁
  // 搜尋特定卡號會顯示所有同名卡牌的卡面
  const officialSearchUrl = `https://hololive-official-cardgame.com/cardlist/?keyword=${encodeURIComponent(id)}&view=image`;

  const isWeb = Platform.OS === 'web';

  if (showInfo) {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setShowInfo(false)} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>← 返回卡牌卡面</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={styles.cardNumber}>{id}</Text>
            <View style={[styles.rarityBadge, { backgroundColor: rarityColors[rarityKey] || '#6b7280' }]}>
              <Text style={styles.rarityText}>{gradeLabels[card.grade] || card.grade || card.rarity}</Text>
            </View>
          </View>
          <Text style={styles.nameJP}>{nameJP}</Text>
          {nameTW && <Text style={styles.nameTW}>{nameTW}</Text>}
          {nameEN && <Text style={styles.nameEN}>{nameEN}</Text>}

          {typeLabel && <View style={styles.metaRow}><Text style={styles.metaLabel}>類型：</Text><Text style={styles.metaValue}>{typeLabel}</Text></View>}
          {colorNames.length > 0 && <View style={styles.metaRow}><Text style={styles.metaLabel}>顏色：</Text><Text style={styles.metaValue}>{colorNames.join(' / ')}</Text></View>}
          {(card.seriesNames || []).length > 0 && <View style={styles.metaRow}><Text style={styles.metaLabel}>系列：</Text><Text style={styles.metaValue}>{(card.seriesNames || []).join(' / ')}</Text></View>}
          {card.tags && card.tags.length > 0 && <View style={styles.metaRow}><Text style={styles.metaLabel}>Tag：</Text><Text style={styles.metaValue}>{card.tags.join(' / ')}</Text></View>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>卡牌效果</Text>
          {effects.length > 0 ? (
            effects.map((kw: string, i: number) => (
              <View key={i} style={styles.effectBlock}><Text style={styles.effectText}>{kw}</Text></View>
            ))
          ) : card.type === 'Oshi' ? (
            <Text style={styles.noEffectText}>推し卡為牌組「主推卡」代表，本身無效果文本。{'\n'}其能力由牌組中同名成員卡所表現。</Text>
          ) : (
            <Text style={styles.noEffectText}>尚未收錄效果文本。</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>搜尋關鍵字</Text>
          <View style={styles.tagWrap}>
            {nameJP && <View style={styles.tag}><Text style={styles.tagText}>{nameJP}</Text></View>}
            {nameTW && <View style={styles.tag}><Text style={styles.tagText}>{nameTW}</Text></View>}
            {card.tags && card.tags.map((t: string, i: number) => (
              <View key={`t-${i}`} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>外部連結</Text>
          <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(officialSearchUrl)}>
            <Text style={styles.linkText}>🏛️ 官方卡表（看卡面）</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(card.yuyuUrl || `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(id)}`)}>
            <Text style={styles.linkText}>🏪 遊々亭（價格查詢）</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(card.carousellUrl || `https://www.carousell.com.tw/search/?q=${encodeURIComponent(id)}`)}>
            <Text style={styles.linkText}>🔄 Carousell</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* iframe 卡牌卡面（網頁版）or 按鈕（手機版） */}
      {isWeb ? (
        /* ===== 網頁版：iframe 嵌入官方 ========= */
        <View style={styles.iframeWrap}>
          <iframe
            src={officialSearchUrl}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 0 } as any}
            title={`${id} 卡牌`}
            allow="fullscreen"
          />
          {/* 浮動按鈕 */}
          <TouchableOpacity style={styles.floatBtnInfo} onPress={() => setShowInfo(true)} activeOpacity={0.7}>
            <Text style={styles.floatBtnText}>📋 卡牌資訊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatBtnOpen} onPress={() => openUrl(officialSearchUrl)} activeOpacity={0.7}>
            <Text style={styles.floatBtnText}>🔗 新分頁</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ===== 手機版：直接引導看卡面 ===== */
        <View style={[styles.mobileCardArea, { backgroundColor: rarityColors[rarityKey] + '18' }]}>
          <Text style={styles.mobilePreviewTitle}>{nameJP}</Text>
          <Text style={styles.mobilePreviewSub}>{id} · {typeLabel}</Text>
          {nameTW && <Text style={styles.mobilePreviewZh}>{nameTW}</Text>}

          <TouchableOpacity
            style={styles.mobileOpenBtn}
            onPress={() => openUrl(officialSearchUrl)}
            activeOpacity={0.8}
          >
            <Text style={styles.mobileOpenBtnText}>🏛️ 點擊查看官方卡面</Text>
          </TouchableOpacity>
          <Text style={styles.mobileHint}>會用瀏覽器開啟官方卡牌頁面</Text>

          <TouchableOpacity style={styles.floatBtnMobile} onPress={() => setShowInfo(true)} activeOpacity={0.7}>
            <Text style={styles.floatBtnMobileText}>📋 卡牌資訊</Text>
          </TouchableOpacity>

          {/* 簡易資訊 */}
          <View style={styles.mobileQuickInfo}>
            {colorNames.length > 0 && <Text style={{ ...styles.quickText, color: COLORS.textSecondary }}>{colorNames.join(' / ')}</Text>}
            {(card.seriesNames || []).length > 0 && <Text style={{ ...styles.quickText, color: COLORS.textSecondary }}>{(card.seriesNames || []).join(' / ')}</Text>}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  backBtn: { padding: 16, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },

  iframeWrap: { width: '100%', height: IFRAME_HEIGHT, position: 'relative', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  floatBtnInfo: { position: 'absolute', top: 12, right: 80, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, zIndex: 10 },
  floatBtnOpen: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, zIndex: 10 },
  floatBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  mobileCardArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  mobilePreviewTitle: { color: COLORS.text, fontSize: 26, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  mobilePreviewSub: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
  mobilePreviewZh: { color: COLORS.primary, fontSize: 16, marginBottom: 16 },
  mobileOpenBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  mobileOpenBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  mobileHint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8 },
  floatBtnMobile: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  floatBtnMobileText: { color: '#fff', fontSize: 12 },
  mobileQuickInfo: { marginTop: 16, alignItems: 'center' },
  quickText: { fontSize: 13, marginBottom: 2 },

  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardNumber: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  rarityBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, minWidth: 50, alignItems: 'center' },
  rarityText: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  nameJP: { color: COLORS.text, fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  nameTW: { color: COLORS.primary, fontSize: 17, marginBottom: 2 },
  nameEN: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 12, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', marginBottom: 6 },
  metaLabel: { color: COLORS.textSecondary, fontSize: 14, marginRight: 6 },
  metaValue: { color: COLORS.text, fontSize: 14, flex: 1 },

  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  effectBlock: { backgroundColor: COLORS.surfaceLight, padding: 14, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  effectText: { color: COLORS.text, fontSize: 14, lineHeight: 24 },
  noEffectText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22, fontStyle: 'italic' },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: COLORS.surfaceLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { color: COLORS.textSecondary, fontSize: 12 },

  linkButton: { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, padding: 16, borderRadius: 10, marginBottom: 8 },
  linkText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
});
