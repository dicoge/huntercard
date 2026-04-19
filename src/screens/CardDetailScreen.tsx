import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Dimensions, Image, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');

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
  const [realPrice, setRealPrice] = useState<null | { price: number; inStock: boolean }>(null);

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

  // Build official site image URL
  const seriesCode = id.split('-')[0] || '';
  // For Oshi cards, use _OSR version; for member cards use the version from card data
  let version = '_OSR.png';
  if (card.versions && card.versions.length > 0) {
    if (card.type === 'Oshi') {
      version = card.versions.find((v: string) => v.startsWith('_OSR') || v.startsWith('_OUR')) || card.versions[0];
    } else {
      // Member card: prefer _U or _C or _R
      version = card.versions.find((v: string) => v.match(/^_(U|C|R)\.(png|jpg)$/)) || card.versions[0] || '_U.png';
    }
  }
  const cardImageUrl = `https://hololive-official-cardgame.com/wp-content/images/cardlist/${seriesCode}/${id}${version}`;

  const officialSearchUrl = `https://hololive-official-cardgame.com/cardlist/?keyword=${encodeURIComponent(id)}&view=image`;
  const yuyuUrl = `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(id)}`;

  // Fetch real price from yuyu-tei via our API
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const resp = await fetch(`https://card-hunter-mu.vercel.app/api/price?q=${encodeURIComponent(id)}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.price !== undefined && data.price !== null) {
            setRealPrice({ price: data.price, inStock: data.inStock !== false });
          }
        }
      } catch (e) { /* skip */ }
    };
    fetchPrice();
  }, [id]);

  return (
    <ScrollView style={styles.container}>
      {/* 卡牌圖片 */}
      <View style={[styles.imageArea, { backgroundColor: rarityColors[rarityKey] + '12' }]}>
        {!imageError ? (
          <TouchableOpacity onPress={() => openUrl(officialSearchUrl)} activeOpacity={0.8}>
            {/* 網頁版用 img 標籤（不受 CORS 限制）*/}
            {/* @ts-ignore */}
            <img
              src={cardImageUrl}
              alt={nameJP}
              style={{ width: width * 0.7, height: width * 0.75, objectFit: 'contain' }}
              onError={() => setImageError(true)}
            />
          </TouchableOpacity>
        ) : (
          /* Fallback */
          <TouchableOpacity style={styles.fallbackArea} onPress={() => openUrl(officialSearchUrl)} activeOpacity={0.8}>
            <Text style={styles.fallbackId}>{id}</Text>
            <Text style={styles.fallbackName}>{nameJP}</Text>
            {nameTW && <Text style={styles.fallbackTw}>{nameTW}</Text>}
            <Text style={styles.fallbackHint}>點擊查看官方卡面 →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 價格資訊（從遊々亭爬蟲） */}
      <View style={styles.priceSection}>
        <View style={styles.priceHeader}>
          <Text style={styles.priceSourceName}>🏪 遊々亭</Text>
          <Text style={styles.priceHint}>（非即時價格，僅供參考）</Text>
        </View>
        {realPrice !== null ? (
          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>¥{realPrice.price.toLocaleString()}</Text>
            <Text style={[styles.priceStock, realPrice.inStock ? styles.inStock : styles.outOfStock]}>
              {realPrice.inStock ? '✓ 可能有庫存' : '✗ 可能缺貨'}
            </Text>
          </View>
        ) : (
          <Text style={styles.priceLoading}>載入價格中...</Text>
        )}
        <TouchableOpacity style={styles.checkPriceBtn} onPress={() => openUrl(yuyuUrl)} activeOpacity={0.7}>
          <Text style={styles.checkPriceBtnText}>🔍 查看即時價格 →</Text>
        </TouchableOpacity>
      </View>

      {/* 基本資訊 */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.cardNumber}>{id}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColors[rarityKey] || '#6b7280' }]}>
            <Text style={styles.rarityText}>{gradeLabels[card.grade] || card.grade || card.rarity}</Text>
          </View>
        </View>
        <Text style={styles.nameJP}>{nameJP}</Text>
        {nameTW && <Text style={styles.nameTW}>{nameTW}</Text>}
        {typeLabel && <View style={styles.metaRow}><Text style={styles.metaLabel}>類型：</Text><Text style={styles.metaValue}>{typeLabel}</Text></View>}
        {colorNames.length > 0 && <View style={styles.metaRow}><Text style={styles.metaLabel}>顏色：</Text><Text style={styles.metaValue}>{colorNames.join(' / ')}</Text></View>}
        {(card.seriesNames || []).length > 0 && <View style={styles.metaRow}><Text style={styles.metaLabel}>系列：</Text><Text style={styles.metaValue}>{(card.seriesNames || []).join(' / ')}</Text></View>}
        {card.tags && card.tags.length > 0 && <View style={styles.metaRow}><Text style={styles.metaLabel}>Tag：</Text><Text style={styles.metaValue}>{card.tags.join(' / ')}</Text></View>}
      </View>

      {/* 卡牌效果 */}
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

      {/* 搜尋關鍵字 */}
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

      {/* 外部連結 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>外部連結</Text>
        <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(officialSearchUrl)}>
          <Text style={styles.linkText}>🏛️ 官方卡表</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(yuyuUrl)}>
          <Text style={styles.linkText}>🏪 遊々亭（價格查詢）</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(card.carousellUrl || `https://www.carousell.com.tw/search/?q=${encodeURIComponent(id)}`)}>
          <Text style={styles.linkText}>🔄 Carousell</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  imageArea: { width: '100%', height: width * 0.8, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cardImage: { width: width * 0.7, height: width * 0.75 },
  fallbackArea: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  fallbackId: { color: COLORS.textSecondary, fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  fallbackName: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  fallbackTw: { color: COLORS.primary, fontSize: 14, marginBottom: 12 },
  fallbackHint: { color: COLORS.primary, fontSize: 13 },

  priceSection: { padding: 20, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  priceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  priceSourceName: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  priceHint: { color: COLORS.textSecondary, fontSize: 11, marginLeft: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  priceValue: { color: COLORS.success, fontSize: 24, fontWeight: 'bold', marginRight: 12 },
  priceStock: { fontSize: 14, fontWeight: '600' },
  inStock: { color: '#10b981' },
  outOfStock: { color: '#ef4444' },
  priceLoading: { color: COLORS.textSecondary, fontSize: 14 },
  checkPriceBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  checkPriceBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardNumber: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  rarityBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, minWidth: 50, alignItems: 'center' },
  rarityText: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  nameJP: { color: COLORS.text, fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  nameTW: { color: COLORS.primary, fontSize: 17, marginBottom: 12 },
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
