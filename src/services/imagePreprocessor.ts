/**
 * imagePreprocessor.ts — Canvas-based image preprocessing for card recognition.
 *
 * Implements OpenCV-style preprocessing using native canvas APIs:
 *   1. Resize to max 1024px
 *   2. Convert to grayscale
 *   3. CLAHE-like contrast enhancement (adaptive histogram equalization)
 *   4. Sharpen convolution (3×3 kernel)
 *
 * This gives the same visual results as OpenCV but without the 8MB WASM overhead.
 * ~10KB vs ~10MB — critical for mobile web performance.
 */

/**
 * Preprocess a card image for better OCR/vision recognition.
 * Returns a JPEG data URI suitable for sending to the API.
 */
export async function preprocessCardImage(imageUri: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    
    // Timeout for corrupted images
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error('Image load timeout'));
    }, 15000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const result = processImage(img);
        resolve(result);
      } catch (e) {
        // Fallback: return original image on processing error
        resolve(imageUri);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image'));
    };

    img.src = imageUri;
  });
}

function processImage(img: HTMLImageElement): string {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  // Step 1: Resize to max 1024px
  const MAX_DIM = 1024;
  if (w > MAX_DIM || h > MAX_DIM) {
    if (w > h) {
      h = Math.round((h / w) * MAX_DIM);
      w = MAX_DIM;
    } else {
      w = Math.round((w / h) * MAX_DIM);
      h = MAX_DIM;
    }
  }

  // Create canvas at target size
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src; // fallback

  // Draw resized image
  ctx.drawImage(img, 0, 0, w, h);

  // Get pixel data for processing
  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = imageData.data;

  // Step 2: Convert to grayscale + Step 3: CLAHE-like contrast enhancement
  // We apply adaptive histogram equalization with local contrast limiting
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < pixels.length; i += 4) {
    // Grayscale using luminance weights
    gray[i / 4] = Math.round(
      0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
    );
  }

  // Apply CLAHE: adaptive histogram equalization in 8x8 tiles
  const TILE_SIZE = 8;
  const CLIP_LIMIT = 2.0;
  const enhanced = applyCLAHE(gray, w, h, TILE_SIZE, CLIP_LIMIT);

  // Step 4: Sharpen (3x3 kernel)
  const sharpened = applySharpen(enhanced, w, h);

  // Write back to canvas
  for (let i = 0; i < sharpened.length; i++) {
    const val = sharpened[i];
    pixels[i * 4] = val;     // R
    pixels[i * 4 + 1] = val; // G
    pixels[i * 4 + 2] = val; // B
    pixels[i * 4 + 3] = 255; // A
  }
  ctx.putImageData(imageData, 0, 0);

  // Return as JPEG
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * CLAHE (Contrast Limited Adaptive Histogram Equalization)
 * 
 * Implementation:
 *   1. Divide image into TILE_SIZE × TILE_SIZE tiles
 *   2. Calculate histogram for each tile
 *   3. Clip histogram at CLIP_LIMIT (redistribute excess)
 *   4. Compute CDF (cumulative distribution function) for each tile
 *   5. Interpolate between tiles for smooth transitions
 *   6. Map pixel values using interpolated CDF
 */
function applyCLAHE(
  gray: Uint8Array,
  w: number,
  h: number,
  tileSize: number,
  clipLimit: number
): Uint8Array {
  const tilesX = Math.ceil(w / tileSize);
  const tilesY = Math.ceil(h / tileSize);
  const result = new Uint8Array(gray.length);

  // Step 1-2: Calculate histograms for each tile
  const histograms: number[][] = [];
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const hist = new Array(256).fill(0);
      const startX = tx * tileSize;
      const startY = ty * tileSize;
      const endX = Math.min(startX + tileSize, w);
      const endY = Math.min(startY + tileSize, h);

      for (let y = startY; y < endY; y++) {
        const row = y * w;
        for (let x = startX; x < endX; x++) {
          hist[gray[row + x]]++;
        }
      }

      // Step 3: Clip histogram
      const totalPixels = (endX - startX) * (endY - startY);
      const clipValue = (totalPixels / 256) * clipLimit;
      let clipped = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > clipValue) {
          clipped += hist[i] - clipValue;
          hist[i] = clipValue;
        }
      }
      // Redistribute clipped pixels evenly
      const redistPerBin = clipped / 256;
      for (let i = 0; i < 256; i++) {
        hist[i] += redistPerBin;
      }

      // Step 4: Compute CDF
      const cdf = new Array(256).fill(0);
      let sum = 0;
      for (let i = 0; i < 256; i++) {
        sum += hist[i];
        cdf[i] = sum;
      }
      // Normalize
      const cdfMin = cdf.find(v => v > 0) || 1;
      const cdfRange = sum - cdfMin;
      for (let i = 0; i < 256; i++) {
        if (cdfRange > 0) {
          cdf[i] = Math.round(((cdf[i] - cdfMin) / cdfRange) * 255);
        } else {
          cdf[i] = i; // fallback to identity
        }
      }

      histograms.push(cdf);
    }
  }

  // Step 5-6: Interpolate and apply
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pixelVal = gray[y * w + x];

      // Find surrounding tiles
      const tx = Math.min(x / tileSize, tilesX - 1.001);
      const ty = Math.min(y / tileSize, tilesY - 1.001);
      const tx0 = Math.floor(tx);
      const ty0 = Math.floor(ty);
      const tx1 = Math.min(tx0 + 1, tilesX - 1);
      const ty1 = Math.min(ty0 + 1, tilesY - 1);

      // Interpolation weights
      const wx = tx - tx0;
      const wy = ty - ty0;

      // Bilinear interpolation of CDF values
      const v00 = histograms[ty0 * tilesX + tx0][pixelVal];
      const v10 = histograms[ty0 * tilesX + tx1][pixelVal];
      const v01 = histograms[ty1 * tilesX + tx0][pixelVal];
      const v11 = histograms[ty1 * tilesX + tx1][pixelVal];

      const interp = Math.round(
        (1 - wx) * (1 - wy) * v00 +
        wx * (1 - wy) * v10 +
        (1 - wx) * wy * v01 +
        wx * wy * v11
      );

      result[y * w + x] = Math.max(0, Math.min(255, interp));
    }
  }

  return result;
}

/**
 * Apply 3×3 sharpen kernel
 * Kernel: [0, -1, 0; -1, 5, -1; 0, -1, 0]
 */
function applySharpen(data: Uint8Array, w: number, h: number): Uint8Array {
  const result = new Uint8Array(data.length);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        const row = (y + ky) * w;
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = (ky + 1) * 3 + (kx + 1);
          sum += data[row + x + kx] * kernel[kidx];
        }
      }
      result[idx] = Math.max(0, Math.min(255, sum));
    }
  }

  // Copy edges from original (sharpen doesn't apply to borders)
  // Top/bottom rows
  for (let x = 0; x < w; x++) {
    result[x] = data[x];                           // top
    result[(h - 1) * w + x] = data[(h - 1) * w + x]; // bottom
  }
  // Left/right columns (excluding corners already set)
  for (let y = 1; y < h - 1; y++) {
    result[y * w] = data[y * w];                   // left
    result[y * w + w - 1] = data[y * w + w - 1];   // right
  }

  return result;
}

export default { preprocessCardImage };