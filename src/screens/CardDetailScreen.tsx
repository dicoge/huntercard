import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Dimensions, Platform, Image } from 'react-native';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');
const CARD_IMG_URL = 'https://tetsunekko.github.io/holotcgtw/cards/';

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
  const [imageError, setImageError] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  if (!card) return <View style={styles.center}><Text style={{ color: COLORS.text }}>無法載入</Text></View>;

  const id = card.cardNumber || card.id;
  const allKW = card.searchKeywords || [];
  const nameJP = allKW[0] || '';
  const nameTW = allKW[1] || '';
  const effects = card.effects || parseEffects(allKW);
  const colorNames = card.colorNames || [];
  const rarityKey = card.grade && ['debut', '1st', '2nd', 'buzz'].includes(card.grade) ?
    (card.grade === 'debut' ? 'C' : card.grade === '1st' ? 'U' : card.grade === '2nd' ? 'R' : 'SR') : 'N';
  const typeLabel = typeLabels[card.type] || card.type || '-';
  const openUrl = (url: string) => Linking.openURL(url);

  const isOshi = card.type === 'Oshi';
  // 官方卡表 URL
  const detailUrl = `https://hololive-official-cardgame.com/cardlist/?keyword=${encodeURIComponent(id)}&view=image`;
  // holotcgtw 圖片 URL（嘗試）
  const imgFolder = card.imageFolder || '';
  const ver = (() => {
    const versions = card.versions || [];
    if (card.type === 'Oshi') return versions.find((v: string) => v.includes('_OSR')) || versions[0] || '_OSR.png';
    return versions.find((v: string) => v.includes('_C.png')) || versions.find((v: string) => v.includes('_U.png')) || versions[0] || '_C.png';
  })();
  const cardImageUrl = `${CARD_IMG_URL}${imgFolder}${id}${ver}`;

  return (
    <ScrollView style={styles.container}>
      {/* 卡牌圖片 / 內嵌官方頁面 */}
      <View style={[styles.imageWrap, { backgroundColor: rarityColors[rarityKey] + '15' }]}>
        {showEmbed ? (
          /* 內嵌官方卡牌頁面 */
          <View style={styles.embedContainer}>
            {Platform.OS === 'web' ? (
              <iframe
                src={detailUrl}
                style={{ width: '100%', height: '100%', border: 'none' } as any}
                title={`${id} 卡牌`}
              />
            ) : (
              <View style={styles.webviewFallback}>
                <Text style={{ color: COLORS.text, fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
                  手機版無法內嵌，請點擊下方按鈕開啟官方頁面
                </Text>
                <TouchableOpacity style={styles.openOfficialBtn} onPress={() => openUrl(detailUrl)}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>🏛️ 開啟官方卡表</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.closeEmbed} onPress={() => setShowEmbed(false)}>
              <Text style={{ color: '#fff', fontSize: 13 }}>✕ 關閉</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* 卡片資訊展示區 */
          <TouchableOpacity
            style={styles.cardInfoArea}
            onPress={() => setShowEmbed(true)}
            activeOpacity={0.7}
          >
            {/* 嘗試載入 holotcgtw 圖片 */}
            {!imageError ? (
              <View style={styles.tryImageWrap}>
                <Image
                  source={{ uri: cardImageUrl }}
                  style={{ width: '100%', height: '100%' } as any}
                  resizeMode="contain"
                  onError={() => setImageError(true)}
                />
              </View>
            ) : (
              <View style={styles.fallbackInfo}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: 8 }}>{id}</Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 }}>{nameJP}</Text>
                {nameTW && <Text style={{ fontSize: 14, color: COLORS.primary, marginBottom: 4 }}>{nameTW}</Text>}
                <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }}>{typeLabel}</Text>
                {colorNames.length > 0 && <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 }}>{colorNames.join(' / ')}</Text>}
              </View>
            )}
            
            {/* 覆蓋文字提示 */}
            <View style={styles.imageOverlay}>
              <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '500' }}>點擊查看官方卡面 →</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* 基本資訊 */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textSecondary }}>{id}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColors[rarityKey] || '#6b7280' }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.text }}>{gradeLabels[card.grade] || card.grade || card.rarity}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 26, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 }}>{nameJP}</Text>
        {nameTW && <Text style={{ fontSize: 16, color: COLORS.primary, marginBottom: 12 }}>{nameTW}</Text>}
        <View style={styles.metaRow}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginRight: 6 }}>類型：</Text>
          <Text style={{ fontSize: 14, color: COLORS.text }}>{typeLabel}</Text>
        </View>
        {colorNames.length > 0 && (
          <View style={styles.metaRow}>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginRight: 6 }}>顏色：</Text>
            <Text style={{ fontSize: 14, color: COLORS.text }}>{colorNames.join(' / ')}</Text>
          </View>
        )}
        {(card.seriesNames || []).length > 0 && (
          <View style={styles.metaRow}>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginRight: 6 }}>系列：</Text>
            <Text style={{ fontSize: 14, color: COLORS.text }}>{(card.seriesNames || []).join(' / ')}</Text>
          </View>
        )}
        {card.tags && card.tags.length > 0 && (
          <View style={styles.metaRow}>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginRight: 6 }}>Tag：</Text>
            <Text style={{ fontSize: 14, color: COLORS.text }}>{card.tags.join(' / ')}</Text>
          </View>
        )}
      </View>

      {/* 卡牌效果 */}
      <View style={styles.section}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>卡牌效果</Text>
        {effects.length > 0 ? (
          effects.map((kw: string, i: number) => (
            <View key={i} style={styles.effectBlock}><Text style={{ fontSize: 14, lineHeight: 24, color: COLORS.text }}>{kw}</Text></View>
          ))
        ) : isOshi ? (
          <Text style={{ fontSize: 14, lineHeight: 22, color: COLORS.textSecondary, fontStyle: 'italic' }}>
            推し卡為牌組「主推卡」代表，本身無效果文本。{'\n'}
            其能力由牌組中同名成員卡所表現。
          </Text>
        ) : (
          <Text style={{ fontSize: 14, lineHeight: 22, color: COLORS.textSecondary, fontStyle: 'italic' }}>尚未收錄效果文本。</Text>
        )}
      </View>

      {/* 搜尋關鍵字 */}
      <View style={styles.section}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>搜尋關鍵字</Text>
        <View style={styles.tagWrap}>
          {nameJP && <View style={styles.tag}><Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{nameJP}</Text></View>}
          {nameTW && <View style={styles.tag}><Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{nameTW}</Text></View>}
          {card.tags && card.tags.map((t: string, i: number) => (
            <View key={`t-${i}`} style={styles.tag}><Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{t}</Text></View>
          ))}
        </View>
      </View>

      {/* 外部連結 */}
      <View style={styles.section}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>外部連結</Text>
        <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(detailUrl)}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>🏛️ 官方卡表</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(card.yuyuUrl || `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(id)}`)}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>🏪 遊々亭（價格查詢）</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(card.carousellUrl || `https://www.carousell.com.tw/search/?q=${encodeURIComponent(id)}`)}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>🔄 Carousell</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  imageWrap: { width: '100%', minHeight: width * 0.5, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  embedContainer: { width: '100%', height: width * 0.8, position: 'relative' },
  closeEmbed: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, zIndex: 10 },
  cardInfoArea: { width: '100%', minHeight: width * 0.45, padding: 20, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  tryImageWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', maxHeight: width * 0.5 },
  fallbackInfo: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageOverlay: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  webviewFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  openOfficialBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 8 },
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rarityBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, minWidth: 50, alignItems: 'center' },
  metaRow: { flexDirection: 'row', marginBottom: 6 },
  effectBlock: { backgroundColor: COLORS.surfaceLight, padding: 14, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: COLORS.surfaceLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  linkButton: { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, padding: 16, borderRadius: 10, marginBottom: 8 },
});
