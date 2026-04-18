import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Dimensions, Image } from 'react-native';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');

const gradeLabels: Record<string, string> = { debut: 'Debut', '1st': '1st', '2nd': '2nd', buzz: 'Buzz', spot: 'Spot' };
const typeLabels: Record<string, string> = { Oshi: '推し（主推卡）', Member: '成員', Support: '支援', Energy: '能量' };
const rarityColors: Record<string, string> = { N: '#6b7280', C: '#6b7280', U: '#10b981', R: '#3b82f6', SR: '#f59e0b' };

// Parse effects from holotcgtw searchKeywords
// [0]=JP name, [1]=TW name, [2]=EN name, [3+]=effect texts
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
  if (!card) return <View style={styles.center}><Text style={{ color: COLORS.text }}>無法載入</Text></View>;

  const id = card.cardNumber || card.id;
  const allKW = card.searchKeywords || [];
  const nameJP = allKW[0] || '';
  const nameTW = allKW[1] || '';
  const nameEN = allKW[2] || '';
  const effects = card.effects || parseEffects(allKW);

  const colorNames = (card.colorNames || []);
  const rarity = card.grade ? gradeLabels[card.grade] : (card.rarity || 'N');
  const rarityKey = card.grade && ['debut', '1st', '2nd', 'buzz'].includes(card.grade) ?
    (card.grade === 'debut' ? 'C' : card.grade === '1st' ? 'U' : card.grade === '2nd' ? 'R' : 'SR') : 'N';
  const typeLabel = typeLabels[card.type] || card.type || '-';
  const openUrl = (url: string) => Linking.openURL(url);

  const isOshi = card.type === 'Oshi';
  const officialUrl = (card.officialUrl || '').startsWith('http')
    ? card.officialUrl
    : `https://hololive-official-cardgame.com/cardlist/cardsearch/?keyword=${encodeURIComponent(id)}`;

  // Choose best image version
  const imgFolder = card.imageFolder || '';
  const versions = card.versions || [];
  let version = versions[0] || '_C.png';
  if (card.type === 'Oshi') {
    version = versions.find((v: string) => v.includes('_OSR')) || versions[0] || '_OSR.png';
  } else {
    version = versions.find((v: string) => v.includes('_C.png')) || versions.find((v: string) => v.includes('_U.png')) || version;
  }
  const cardImageUrl = `${imgFolder}${id}${version}`;

  const SERIES_NAMES: Record<string, string> = {
    hBP01: 'ブルーミングレディアンス', hBP02: 'クインテットスペクトラム', hBP03: 'サバイバル・オブ・ザ・フェイビアス',
    hSD01: 'スターターデッキ ときのそら', hSD02: 'スターターデッキ 白上フブキ', hSD03: 'スターターデッキ 湊あくあ',
    hSD04: 'スターターデッキ 天音かなた', hSD05: 'スターターデッキ ReGLOSS', hSD06: 'スターターデッキ 風真いろは',
    hSD07: 'スターターデッキ 癒月ちょこ', hPR: 'Promo',
  };
  const seriesNames = (card.series || []).map((s: string) => SERIES_NAMES[s] || s);

  return (
    <ScrollView style={styles.container}>
      {/* 卡牌圖片或替代顯示 */}
      <CardImage id={id} imageUrl={cardImageUrl} isOshi={isOshi} colors={colorNames}
        typeLabel={typeLabel} rarityKey={rarityKey} nameJP={nameJP} nameTW={nameTW}
        onOpenOfficial={() => openUrl(officialUrl)} />

      {/* 基本資訊 */}
      {seriesNames.length > 0 && (
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={styles.cardNumber}>{id}</Text>
            <View style={[styles.rarityBadge, { backgroundColor: rarityColors[rarityKey] }]}>
              <Text style={styles.rarityText}>{gradeLabels[card.grade] || card.grade || card.rarity}</Text>
            </View>
          </View>
          <Text style={styles.nameJP}>{nameJP}</Text>
          {nameTW && <Text style={styles.nameTW}>{nameTW}</Text>}
          {nameEN && <Text style={styles.nameEN}>{nameEN}</Text>}
          {seriesNames.length > 0 && <View style={styles.metaRow}><Text style={styles.metaLabel}>系列：</Text><Text style={styles.metaValue}>{seriesNames.join(' / ')}</Text></View>}
          {colorNames.length > 0 && <View style={styles.metaRow}><Text style={styles.metaLabel}>顏色：</Text><Text style={styles.metaValue}>{colorNames.join(' / ')}</Text></View>}
          <View style={styles.metaRow}><Text style={styles.metaLabel}>類型：</Text><Text style={styles.metaValue}>{typeLabel}</Text></View>
          {card.tags && card.tags.length > 0 && <View style={styles.metaRow}><Text style={styles.metaLabel}>Tag：</Text><Text style={styles.metaValue}>{card.tags.join(' / ')}</Text></View>}
        </View>
      )}

      {/* 卡牌效果 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>卡牌效果</Text>
        {effects.length > 0 ? effects.map((kw: string, i: number) => (
          <View key={i} style={styles.effectBlock}><Text style={styles.effectText}>{kw}</Text></View>
        )) : isOshi ? (
          <Text style={styles.noEffectText}>推し卡為牌組「主推卡」代表，本身無效果文本。{'\n'}其能力由牌組中同名成員卡所表現。</Text>
        ) : card.type === 'Support' ? (
          <Text style={styles.noEffectText}>支援卡，效果為：{effects.length > 0 ? effects.join('\n') : '詳細請見官方'}</Text>
        ) : (
          <Text style={styles.noEffectText}>尚未收錄效果文本。</Text>
        )}
      </View>

      {/* 關鍵字 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>搜尋關鍵字</Text>
        <View style={styles.tagWrap}>
          {nameJP && <View style={styles.tag}><Text style={styles.tagText}>{nameJP}</Text></View>}
          {nameTW && <View style={styles.tag}><Text style={styles.tagText}>{nameTW}</Text></View>}
          {nameEN && <View style={styles.tag}><Text style={styles.tagText}>{nameEN}</Text></View>}
          {card.tags && card.tags.map((t: string, i: number) => (
            <View key={`t-${i}`} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
          ))}
        </View>
      </View>

      {/* 外部連結 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>外部連結</Text>
        <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(officialUrl)}>
          <Text style={styles.linkText}>🏛️ 官方卡表</Text>
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

// ──────────────────────────────────────────────
// Card Image Component - tries to load image, falls back to colored placeholder
// ──────────────────────────────────────────────
function CardImage(props: {
  id: string; imageUrl: string; isOshi: boolean; colors: string[];
  typeLabel: string; rarityKey: string; nameJP: string; nameTW: string;
  onOpenOfficial: () => void;
}) {
  const [error, setError] = useState(false);

  if (error || !props.imageUrl) {
    return (
      <TouchableOpacity style={[styles.imageArea, { backgroundColor: rarityColors[props.rarityKey] + '18' }]} onPress={props.onOpenOfficial} activeOpacity={0.7}>
        <Text style={styles.fallbackId}>{props.id}</Text>
        <Text style={styles.fallbackName}>{props.nameJP}</Text>
        {props.nameTW && <Text style={styles.fallbackTw}>{props.nameTW}</Text>}
        <Text style={styles.fallbackType}>{props.typeLabel}</Text>
        {props.colors.length > 0 && <Text style={styles.fallbackColors}>{props.colors.join(' / ')}</Text>}
        <Text style={styles.fallbackHint}>點擊查看官方卡面 →</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.imageArea, { backgroundColor: rarityColors[props.rarityKey] + '18' }]}
      onPress={props.onOpenOfficial} activeOpacity={0.7}>
      <Image source={{ uri: props.imageUrl }} style={styles.cardImage}
        resizeMode="contain" onError={() => setError(true)} />
      {/* Overlay text (visible if image has transparent bg) */}
      <View style={styles.imageOverlay}>
        <Text style={styles.overlayId}>{props.id}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  imageArea: { width: '100%', height: width * 0.5, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, padding: 20 },
  cardImage: { width: '100%', height: '100%', position: 'absolute' },
  imageOverlay: { position: 'absolute', bottom: 10, right: 10 },
  overlayId: { color: COLORS.text, fontSize: 12, opacity: 0.5 },
  fallbackId: { color: COLORS.textSecondary, fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  fallbackName: { color: COLORS.text, fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  fallbackTw: { color: COLORS.primary, fontSize: 16, marginBottom: 4 },
  fallbackType: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  fallbackColors: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 12 },
  fallbackHint: { color: COLORS.primary, fontSize: 13, marginTop: 8 },
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
