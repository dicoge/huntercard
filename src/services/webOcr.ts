/**
 * Web OCR Service
 * 在 web 版使用 Tesseract.js 替代 expo-ocr-kit
 */

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
