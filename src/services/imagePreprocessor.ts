/**
 * imagePreprocessor.ts — OpenCV-based image preprocessing for card recognition.
 *
 * Uses @techstark/opencv-js (OpenCV WASM in browser) to:
 * 1. Resize to reasonable size
 * 2. Convert to grayscale
 * 3. Apply CLAHE (contrast enhancement) for better text readability
 * 4. Apply sharpening kernel
 * 5. Return preprocessed image as data URI
 *
 * This makes card numbers/names more readable for Gemini Vision,
 * especially on holographic/shiny cards with glare.
 */

import * as cv from '@techstark/opencv-js';

let cvReady = false;

/**
 * Initialize OpenCV. Must be called once before preprocessImage.
 * OpenCV loads WASM asynchronously, so we need to wait for it.
 */
export async function initOpenCv(): Promise<void> {
  if (cvReady) return;
  // @techstark/opencv-js auto-initializes on import, but wait for cv.Mat to be available
  return new Promise((resolve) => {
    const check = () => {
      if (typeof cv !== 'undefined' && cv.Mat) {
        cvReady = true;
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

/**
 * Preprocess a card image for better OCR/vision recognition.
 * Steps:
 *   1. Decode image from data URI
 *   2. Resize to max 1024px
 *   3. Convert to grayscale
 *   4. Apply CLAHE (contrast enhancement on shiny/holographic cards)
 *   5. Apply sharpen kernel
 *   6. Return as JPEG data URI
 */
export async function preprocessCardImage(imageUri: string): Promise<string> {
  await initOpenCv();

  // Load image from URI
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = imageUri;
  });

  // Create canvas with original size
  let src = cv.matFromImageData(
    getImageDataFromImage(img)
  );

  try {
    // Step 1: Resize if too large (max 1024px)
    let processed = src;
    if (src.rows > 1024 || src.cols > 1024) {
      const maxDim = 1024;
      let newW: number, newH: number;
      if (src.cols > src.rows) {
        newW = maxDim;
        newH = Math.round((src.rows / src.cols) * maxDim);
      } else {
        newH = maxDim;
        newW = Math.round((src.cols / src.rows) * maxDim);
      }
      const resized = new cv.Mat();
      cv.resize(src, resized, new cv.Size(newW, newH), 0, 0, cv.INTER_AREA);
      src.delete();
      processed = resized;
    }

    // Step 2: Convert to grayscale
    const gray = new cv.Mat();
    cv.cvtColor(processed, gray, cv.COLOR_RGBA2GRAY);

    // Step 3: Apply CLAHE (contrast enhancement)
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    const enhanced = new cv.Mat();
    clahe.apply(gray, enhanced);
    clahe.delete();

    // Step 4: Apply sharpen kernel
    const sharpKernel = cv.matFromArray(3, 3, cv.CV_32F, [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ]);
    const sharpened = new cv.Mat();
    cv.filter2D(enhanced, sharpened, cv.CV_8U, sharpKernel);
    sharpKernel.delete();

    // Step 5: Convert back to 3-channel for JPEG output
    const result = new cv.Mat();
    cv.cvtColor(sharpened, result, cv.COLOR_GRAY2RGBA);

    // Convert Mat to canvas
    const canvas = document.createElement('canvas');
    canvas.width = result.cols;
    canvas.height = result.rows;
    const ctx = canvas.getContext('2d')!;
    const imgData = new ImageData(
      new Uint8ClampedArray(result.data),
      result.cols,
      result.rows
    );
    canvas.width = result.cols;
    canvas.height = result.rows;
    ctx.putImageData(imgData, 0, 0);

    const dataUri = canvas.toDataURL('image/jpeg', 0.9);

    // Cleanup
    processed.delete();
    gray.delete();
    enhanced.delete();
    sharpened.delete();
    result.delete();

    return dataUri;
  } finally {
    if (src && !src.isDeleted()) src.delete();
  }
}

/**
 * Helper: Extract ImageData from an HTML Image element.
 * This is needed because OpenCV.js works with cv.Mat, not directly with images.
 */
function getImageDataFromImage(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export default { initOpenCv, preprocessCardImage };