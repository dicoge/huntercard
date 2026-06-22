/**
 * Web OCR Service
 * 在 web 版使用 Tesseract.js 替代 expo-ocr-kit
 *
 * Enhanced with YOLOv8 ONNX inference for smart card number region detection.
 * Uses YOLO to find the exact card number area before cropping, instead of
 * the old fixed bottom-20% crop.
 */

import { detectCardNumber, YOLODetection } from './yoloDetect';

let Tesseract: any = null;

async function getTesseract() {
  if (!Tesseract) {
    Tesseract = await import('tesseract.js');
  }
  return Tesseract;
}

export async function recognizeTextWeb(imageUri: string): Promise<{ text: string }> {
  const t = await getTesseract();

  // data-uri 或 blob URL 皆可給 Tesseract
  const result = await t.recognize(imageUri, 'jpn+eng', {
    logger: (info: any) => {
      if (info.status === 'recognizing text') {
        console.log(`[webOcr] progress: ${Math.round(info.progress * 100)}%`);
      }
    },
  });

  return { text: result.data.text };
}

/**
 * 從圖片中裁切卡號區域（底部 20%，左右各留 10% 邊距）
 * hololive 卡牌的卡號固定印在卡片右下角，裁切後送 OCR 可大幅減少雜訊干擾。
 * @returns data URI of the cropped region
 */
async function cropCardNumberArea(imageUri: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image for cropping'));
    image.src = imageUri;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context for cropping');

  const w = Math.min(img.width, 2048);
  const h = Math.min(img.height, 2048);

  // 裁切區域：底部 20%，左右各裁 10%
  const cropX = Math.round(w * 0.1);
  const cropY = Math.round(h * 0.8);
  const cropW = Math.round(w * 0.8);
  const cropH = Math.round(h * 0.2);

  canvas.width = cropW;
  canvas.height = cropH;

  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return imageUri;
  }
}

/**
 * 自定義區域裁切：從圖片中裁切指定 bbox 區域，回傳 data URI
 * @param imageUri - 原圖 URI
 * @param bbox - 裁切區域 { x, y, width, height } (像素座標)
 * @returns data URI of the cropped region
 */
async function cropRegion(imageUri: string, bbox: { x: number; y: number; width: number; height: number }): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image for custom crop'));
    image.src = imageUri;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context for custom crop');

  // Clamp bbox to image dimensions
  const cropX = Math.max(0, Math.round(bbox.x));
  const cropY = Math.max(0, Math.round(bbox.y));
  const cropW = Math.min(img.width - cropX, Math.round(bbox.width));
  const cropH = Math.min(img.height - cropY, Math.round(bbox.height));

  if (cropW <= 0 || cropH <= 0) {
    throw new Error('Invalid crop region: zero or negative dimensions');
  }

  canvas.width = cropW;
  canvas.height = cropH;

  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return imageUri;
  }
}

/**
 * 從裁切區 OCR 文字中提取卡號（支援 hBP04-005、BP04-005、NP04-005 等格式）
 */
function extractCardId(text: string): string | null {
  // 正規化文字：全形→半形、統一字元
  const normalized = text
    .normalize('NFKC')
    .replace(/[oO〇]/g, '0')
    .replace(/[lI｜]/g, '1')
    .replace(/[－‐-―−－]/g, '-')
    .replace(/[‾\s]/g, '-')
    .replace(/-$/, '');

  // 優先匹配 h 前綴的標準卡號
  const hMatch = normalized.match(/h[a-z]{2}\d{0,2}-\d{1,3}/i);
  if (hMatch) return hMatch[0].toLowerCase();

  // 無 h 前綴的卡號（如 BP04-005）
  const idMatch = normalized.match(/[a-z]{2}\d{2}-\d{3}/i);
  if (idMatch) {
    const raw = idMatch[0].toLowerCase();
    // 前綴別名對照
    const prefixAliases: Record<string, string> = {
      np: 'hbp',
      bp: 'hbp',
      sd: 'hsd',
      pr: 'hpr',
      sp: 'hsp',
      ocg: 'hocg',
      pc: 'hpc',
      cs: 'hcs',
      co: 'hco',
      wf: 'hwf',
      ys: 'hys',
      ent: 'hent',
    };
    const prefix = raw.slice(0, 2);
    const rest = raw.slice(2);
    return (prefixAliases[prefix] || 'h' + prefix) + rest;
  }

  return null;
}

/**
 * 卡號優先 OCR：先從 YOLO 偵測的區域找卡號，再 fallback 到固定裁切，最後全圖 OCR
 * @returns cardId 找到的卡號（如 hBP04-005），或 null；rawText 為 OCR 原始文字
 */
export async function recognizeCardNumber(imageUri: string): Promise<{ cardId: string | null; rawText: string }> {
  const t = await getTesseract();

  // Step 0: YOLO detection — find the exact card number region
  try {
    const yoloResult = await detectCardNumber(imageUri);
    if (yoloResult && yoloResult.confidence > 0.5) {
      console.log(`[webOcr] YOLO detected card number region with confidence ${yoloResult.confidence.toFixed(3)}`);
      const croppedUri = await cropRegion(imageUri, yoloResult.bbox);
      const yoloResult_ocr = await t.recognize(croppedUri, 'jpn+eng', {
        logger: (info: any) => {
          if (info.status === 'recognizing text') {
            console.log(`[webOcr][yolo-crop] progress: ${Math.round(info.progress * 100)}%`);
          }
        },
      });
      const cardId = extractCardId(yoloResult_ocr.data.text);
      if (cardId) {
        console.log(`[webOcr] YOLO-guided OCR succeeded: ${cardId}`);
        return { cardId, rawText: yoloResult_ocr.data.text };
      }
      console.log('[webOcr] YOLO crop OCR found no card number, falling through');
    } else if (yoloResult) {
      console.log(`[webOcr] YOLO confidence ${yoloResult.confidence.toFixed(3)} <= 0.5, falling through`);
    } else {
      console.log('[webOcr] YOLO returned no detection, falling through');
    }
  } catch (e) {
    console.warn('[webOcr] YOLO detection failed, falling through:', e);
  }

  // Step 1: 裁切底部區域，對裁切區跑 OCR
  let croppedUri: string;
  try {
    croppedUri = await cropCardNumberArea(imageUri);
  } catch (e) {
    console.warn('[webOcr] crop failed, falling back to full image:', e);
    const full = await t.recognize(imageUri, 'jpn+eng');
    return { cardId: extractCardId(full.data.text), rawText: full.data.text };
  }

  const croppedResult = await t.recognize(croppedUri, 'jpn+eng', {
    logger: (info: any) => {
      if (info.status === 'recognizing text') {
        console.log(`[webOcr][crop] progress: ${Math.round(info.progress * 100)}%`);
      }
    },
  });

  // Step 2: 從裁切區 OCR 結果提取卡號
  const cardId = extractCardId(croppedResult.data.text);
  if (cardId) {
    return { cardId, rawText: croppedResult.data.text };
  }

  // Step 3: Fallback — 對全圖做 OCR 並提取卡號
  console.log('[webOcr] no card number in cropped area, falling back to full image OCR');
  try {
    const fullResult = await t.recognize(imageUri, 'jpn+eng');
    return { cardId: extractCardId(fullResult.data.text), rawText: fullResult.data.text };
  } catch (e) {
    console.warn('[webOcr] fallback OCR failed:', e);
    return { cardId: null, rawText: '' };
  }
}
