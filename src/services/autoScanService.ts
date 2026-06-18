/**
 * Auto-Scan Detection Service
 *
 * Analyzes camera frames to detect when a card is centered and stable
 * in the scan area. Uses canvas-based brightness + edge detection.
 *
 * Auto-scan only works on web (native camera doesn't support frame analysis).
 * Native keeps manual scan (button press).
 */

export interface FrameAnalysis {
  /** Card detected in frame */
  hasCard: boolean;
  /** Card position stabilized over multiple frames */
  isStable: boolean;
  /** Detection confidence 0-1 */
  confidence: number;
  /** Average brightness 0-1 */
  brightness: number;
  /** Edge density (card has straight edges) */
  edgeDensity: number;
}

/**
 * Analyze a single video frame for card presence
 * Uses canvas to extract pixel data and detect card characteristics
 */
export function analyzeFrame(
  videoElement: HTMLVideoElement,
  scanArea: { x: number; y: number; width: number; height: number }
): FrameAnalysis {
  const canvas = document.createElement('canvas');
  canvas.width = scanArea.width;
  canvas.height = scanArea.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { hasCard: false, isStable: false, confidence: 0, brightness: 0, edgeDensity: 0 };
  }

  // Draw the scan area portion of the video onto the canvas
  ctx.drawImage(
    videoElement,
    scanArea.x, scanArea.y, scanArea.width, scanArea.height,
    0, 0, scanArea.width, scanArea.height
  );
  const imageData = ctx.getImageData(0, 0, scanArea.width, scanArea.height);
  const pixels = imageData.data;

  // Calculate average brightness
  let totalBrightness = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    totalBrightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
  }
  const brightness = totalBrightness / (pixels.length / 4) / 255;

  // Edge detection using Sobel-like horizontal gradient
  const width = scanArea.width;
  const height = scanArea.height;
  let edgePixels = 0;
  const threshold = 60; // Higher = fewer false positives (was 30)

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const left = ((y * width + (x - 1)) * 4);
      const right = ((y * width + (x + 1)) * 4);
      const top = (((y - 1) * width + x) * 4);
      const bottom = (((y + 1) * width + x) * 4);

      const gx = Math.abs(
        (pixels[left] + pixels[left + 1] + pixels[left + 2]) / 3 -
        (pixels[right] + pixels[right + 1] + pixels[right + 2]) / 3
      );
      const gy = Math.abs(
        (pixels[top] + pixels[top + 1] + pixels[top + 2]) / 3 -
        (pixels[bottom] + pixels[bottom + 1] + pixels[bottom + 2]) / 3
      );

      if (gx + gy > threshold) edgePixels++;
    }
  }

  const edgeDensity = edgePixels / (width * height);

  // Card detection heuristic:
  // Cards typically have moderate brightness (not too dark/light) and have straight edges
  const hasCard = brightness > 0.2 && brightness < 0.8 && edgeDensity > 0.12 && edgeDensity < 0.4;
  const confidence = Math.min(1, Math.max(0,
    (hasCard ? 0.6 : 0) +
    (brightness > 0.2 && brightness < 0.8 ? 0.2 : 0) +
    (edgeDensity > 0.1 && edgeDensity < 0.4 ? 0.2 : 0)
  ));

  return { hasCard, isStable: false, confidence, brightness, edgeDensity };
}

// ── Stability Detection ──

const frameHistory: FrameAnalysis[] = [];
const STABILITY_FRAMES = 10; // Need 10 consecutive frames with card (was 5)

/**
 * Analyze frame with stability tracking
 * Keeps a buffer of recent frames and checks if a card
 * has been consistently detected with stable brightness
 */
export function analyzeFrameWithStability(
  videoElement: HTMLVideoElement,
  scanArea: { x: number; y: number; width: number; height: number }
): FrameAnalysis {
  const result = analyzeFrame(videoElement, scanArea);

  frameHistory.push(result);
  if (frameHistory.length > STABILITY_FRAMES + 3) {
    frameHistory.shift();
  }

  // Check stability: last N frames all detected card
  const recentFrames = frameHistory.slice(-STABILITY_FRAMES);
  const allDetected = recentFrames.length >= STABILITY_FRAMES &&
    recentFrames.every(f => f.hasCard);

  // Check brightness variance (if it suddenly changes, card was moved)
  const brightnessVariance = recentFrames.length > 1
    ? Math.max(...recentFrames.map(f => f.brightness)) - Math.min(...recentFrames.map(f => f.brightness))
    : 1;
  const brightnessStable = brightnessVariance < 0.15;

  result.isStable = allDetected && brightnessStable;

  return result;
}

/**
 * Reset frame history (call after successful scan or camera switch)
 */
export function resetAutoScan(): void {
  frameHistory.length = 0;
}