import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');

const gradeLabels: Record<string, string> = { debut: 'Debut', '1st': '1st', '2nd': '2nd', buzz: 'Buzz', spot: 'Spot' };
const typeLabels: Record<string, string> = { Oshi: '推し（主推卡）', Member: '成員', Support: '支援卡', Energy: '能量', Buzz: 'Buzz' };
const rarityColors: Record<string, string> = { N: '#6b7280', C: '#6b7280', U: '#10b981', R: '#3b82f6', SR: '#f59e0b' };

// Price estimate by rarity (approximate yuyu-tei prices in JPY)
const priceEstimate: Record<string, { min: number; est: number; max: number }> = {
  'C':   { min: 80,   est: 150,  max: 300 },
  'U':   { min: 150,  est: 300,  max: 600 },
  'R':   { min: 400,  est: 800,  max: 1500 },
  'SR':  { min: 1000, est: 2000, max: 3500 },
  'N':   { min: 50,   est: 100,  max: 200 },
};

function parseEffects(keywords: string[]): string[] {
  if (!keywords) return [];
  // Keywords: [0]=JP name, [1]=TW name, [2]=EN name, [3+]=effects
  return keywords.slice(3).filter((kw) => {
    const t = kw.trim();
    if (t.length < 5) return false;
    // Filter out keywords that are just names/tags
    const gameTerms = ['給予', '抽', '傷害', '牌組', '手札', '成員', '中央', '藝能', 'HP', '生命',
      '階段', '回合', '特殊', '公開', '聯動', '擊倒', '剩餘', '持有', '超過', '以下', '以上',
      '最多', '備', '骰子', '奇數', '偶數', '回復', '存檔', '聲援', '舞台', '成本', '效果',
      '能力', '選擇', '丟棄', '放置', '移動', '觸發', '永續'];
    // Also check if it's a real JP effect (contains JP characters + game terms)
    const hasJpChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(t);
    return gameTerms.some(term => t.includes(term)) && hasJpChars;
  });
}

function buildImageUrl(cardNumber: string, versions: string[], cardType: string): string {
  const seriesCode = cardNumber.split('-')[0] || '';
  let version = '_OSR.png';

  if (versions && versions.length > 0) {
    if (cardType === 'Oshi') {
      version = versions.find((v) => v.includes('_OSR') || v.includes('_OUR')) || versions[0] || '_OSR.png';
    } else if (cardType === 'Support') {
      version = versions.find((v) => v.includes('_S') || v.includes('_P')) || versions.find((v) => v.includes('.png')) || versions[0] || '_U.png';
    } else {
      // Member card: prefer _U (unique), _R, then _C (common)
      version = versions.find((v) => v.startsWith('_U.') || v.startsWith('_R.') || v.startsWith('_C.'))
        || versions.find((v) => v.includes('.png') || v.includes('.jpg'))
        || versions[0] || '_U.png';
      // Remove any leading underscore version prefix duplicates
      if (version.includes('_U._U') || version.includes('_R._R')) {
        version = version.replace(/_(U|R)\._(U|R)\./, '_$1.');
      }
    }
  }

  return `https://hololive-official-cardgame.com/wp-content/images/cardlist/${seriesCode}/${cardNumber}${version}`;
}

export default function CardDetailScreen({ route, navigation }: any) {
  const { card } = route.params || {};
  const [imageError, setImageError] = useState(false);

  if (!card) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.text }}>無法載入卡牌資料</Text>
      </View>
    );
  }

  const id = card.cardNumber || card.id || '';
  const allKW = card.searchKeywords || [];
  const nameJP = allKW[0] || card.name || '';
  const nameTW = allKW[1] || '';
  const nameEN = allKW[2] || '';
  const rarityKey = card.rarity || (card.grade === 'buzz' ? 'SR' : card.grade === 'debut' ? 'C' : card.grade === '1st' ? 'U' : 'R');
  const typeLabel = typeLabels[card.type] || card.type || '-';

  const effects = card.effects || parseEffects(allKW);
  const colorNames = card.colorNames && card.colorNames.length > 0
    ? card.colorNames
    : (card.color ? (Array.isArray(card.color) ? card.color : [card.color]).filter(Boolean).map((c: string) => {
        const map: Record<string, string> = { white: '白', blue: '藍', green: '綠', red: '紅', purple: '紫', yellow: '黃', colorless: '無色', multicolor: '多色' };
        return map[c] || c;
      }) : []);
  
  const seriesNames = card.seriesNames || [];
  const tags = card.tags || [];
  const versions = card.versions || [];

  // Use API-provided imageUrl when available, otherwise build from pattern
  const imageUrl = card.imageUrl || buildImageUrl(id, versions, card.type || '');
  const officialUrl = `https://hololive-official-cardgame.com/cardlist/?keyword=${encodeURIComponent(id)}&view=image`;
  const yuyuUrl = `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(id)}`;

  // Price estimate
  const priceInfo = priceEstimate[rarityKey] || priceEstimate['C'];
  const displayPrice = priceInfo.est;

  return (
    <ScrollView style={styles.container}>
      {/* ====== CARD IMAGE ====== */}
      <View style={[styles.imageArea, { backgroundColor: rarityColors[rarityKey] + '0a' }]}>
        {!imageError ? (
          <View style={styles.imgContainer}>
            {/* HTML <img> tag — works directly, no CORS issues for display */}
            {/* @ts-ignore */}
            <img
              src={imageUrl}
              alt={`${id} ${nameJP}`}
              style={{ maxWidth: width * 0.7, maxHeight: width * 0.85, objectFit: 'contain', cursor: 'pointer' }}
              onClick={() => window.open(officialUrl, '_blank')}
              onError={() => setImageError(true)}
            />
          </View>
        ) : (
          /* Fallback when image fails */
          <TouchableOpacity style={styles.fallbackArea} activeOpacity={0.8} onPress={() => window.open(officialUrl, '_blank')}>
            <Text style={styles.fallbackId}>{id}</Text>
            <Text style={styles.fallbackName}>{nameJP}</Text>
            {nameTW && <Text style={styles.fallbackTw}>{nameTW}</Text>}
            <Text style={styles.fallbackHint}>點擊查看官方卡面 →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ====== PRICE SECTION ====== */}
      <View style={[styles.priceSection, { backgroundColor: COLORS.surface }]}>
        <View style={styles.priceHeader}>
          <Text style={styles.priceSourceName}>🏪 遊々亭</Text>
          <Text style={styles.priceBadge}>預估價格</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceValue}>¥{displayPrice.toLocaleString()}</Text>
          <Text style={styles.priceRange}> (¥{priceInfo.min} ~ ¥{priceInfo.max})</Text>
        </View>
        <Text style={styles.priceNote}>⚠️ 非即時價格，僅供參考</Text>
        <TouchableOpacity style={styles.checkPriceBtn} onPress={() => window.open(yuyuUrl, '_blank')}>
          <Text style={styles.checkPriceBtnText}>🔍 查看遊々亭即時價格 →</Text>
        </TouchableOpacity>
      </View>

      {/* ====== CARD BASIC INFO ====== */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.cardNumber}>{id}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColors[rarityKey] || '#6b7280' }]}>
            <Text style={styles.rarityText}>{gradeLabels[card.grade] || card.grade || rarityKey}</Text>
          </View>
        </View>

        <Text style={styles.nameJP}>{nameJP}</Text>
        {nameTW && <Text style={styles.nameTW}>{nameTW}</Text>}
        {nameEN && nameEN !== nameJP && nameEN !== nameTW && <Text style={styles.nameEN}>{nameEN}</Text>}

        {typeLabel && (
          <InfoRow label="類型" value={typeLabel} />
        )}
        {colorNames.length > 0 && (
          <InfoRow label="顏色" value={colorNames.join(' / ')} />
        )}
        {seriesNames.length > 0 && (
          <InfoRow label="系列" value={seriesNames.join(' / ')} />
        )}
        {tags.length > 0 && (
          <InfoRow label="Tag" value={tags.join(' / ')} />
        )}
      </View>

      {/* ====== EFFECT TEXTS ====== */}
      {(effects.length > 0 || card.type === 'Oshi') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>卡牌效果</Text>
          {effects.length > 0 ? (
            effects.map((kw: string, i: number) => (
              <View key={i} style={styles.effectBlock}>
                <Text style={styles.effectText}>{kw}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noEffectText}>
              推い卡為牌組「主推卡」代表，本身無效果文本。{'\n'}
              其能力由牌組中同名成員卡所表現。
            </Text>
          )}
        </View>
      )}

      {/* ====== SEARCH KEYWORDS ====== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>搜尋關鍵字</Text>
        <View style={styles.tagWrap}>
          {nameJP && <Tag text={nameJP} />}
          {nameTW && <Tag text={nameTW} />}
          {tags.map((t: string, i: number) => <Tag key={`t${i}`} text={t} />)}
        </View>
      </View>

      {/* ====== EXTERNAL LINKS ====== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>外部連結</Text>
        <LinkButton icon="🏛️" text="官方卡表" url={officialUrl} />
        <LinkButton icon="🏪" text="遊々亭（價格查詢）" url={yuyuUrl} />
        <LinkButton icon="🔄" text="Carousell 二手價格" url={`https://www.carousell.com.tw/search/?q=${encodeURIComponent(id)}`} />
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ─── Helper Components ────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}：</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

function LinkButton({ icon, text, url }: { icon: string; text: string; url: string }) {
  return (
    <TouchableOpacity style={styles.linkButton} onPress={() => window.open(url, '_blank')}>
      <Text style={styles.linkText}>{icon} {text}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20 },

  // Image area
  imageArea: { width: '100%', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border + '44', paddingHorizontal: 12, paddingVertical: 16 },
  imgContainer: { width: '100%', alignItems: 'center' },
  fallbackArea: { alignItems: 'center', padding: 32 },
  fallbackId: { fontSize: 22, fontWeight: 'bold', color: COLORS.text + '99', marginBottom: 8 },
  fallbackName: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  fallbackTw: { fontSize: 15, color: COLORS.primary, marginBottom: 12 },
  fallbackHint: { fontSize: 13, color: COLORS.primary },

  // Price section
  priceSection: { paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border + '44' },
  priceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  priceSourceName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  priceBadge: { marginLeft: 10, backgroundColor: COLORS.surfaceLight, color: COLORS.textSecondary, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  priceValue: { fontSize: 28, fontWeight: 'bold', color: '#10b981' },
  priceRange: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 6 },
  priceNote: { fontSize: 11, color: COLORS.textSecondary + 'bb', marginBottom: 12 },
  checkPriceBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  checkPriceBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Info section
  section: { paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border + '44' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardNumber: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '700' },
  rarityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, minWidth: 48, alignItems: 'center' },
  rarityText: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  nameJP: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, marginBottom: 3 },
  nameTW: { fontSize: 17, color: COLORS.primary, marginBottom: 3 },
  nameEN: { fontSize: 13, color: COLORS.text + '88', marginBottom: 12, fontStyle: 'italic' },
  infoRow: { flexDirection: 'row', marginBottom: 5 },
  infoLabel: { fontSize: 14, color: COLORS.textSecondary, marginRight: 6 },
  infoValue: { fontSize: 14, color: COLORS.text, flex: 1 },

  // Effects
  effectBlock: { backgroundColor: COLORS.surfaceLight + 'cc', padding: 14, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  effectText: { fontSize: 14, lineHeight: 22, color: COLORS.text },
  noEffectText: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary + 'bb', fontStyle: 'italic' },

  // Tags
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: COLORS.surfaceLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 12, color: COLORS.textSecondary },

  // Links
  linkButton: { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border + '88', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginBottom: 8 },
  linkText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
});
