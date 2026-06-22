/**
 * YOLOv8 ONNX Inference Service
 *
 * Uses onnxruntime-web with WebGL backend to run YOLOv8n
 * for card number region detection on hololive TCG cards.
 *
 * Lazy singleton pattern: model is loaded once on first call, cached for subsequent calls.
 */

// @ts-ignore - onnxruntime-web may have type issues in some environments
import * as ort from 'onnxruntime-web';

export interface YOLODetection {
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

// ── Constants ──

const MODEL_URL = '/models/yolov8n-card-number.onnx';
const INPUT_SIZE = 416;
const CONFIDENCE_THRESHOLD = 0.3;
const IOU_THRESHOLD = 0.5;

// ── Lazy singleton with promise caching ──

let sessionPromise: Promise<ort.InferenceSession> | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    console.log('[yoloDetect] Loading ONNX model...');
    sessionPromise = ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['webgl'],
    });
  }
  return sessionPromise;
}

// ── Math helpers ──

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function intersectionOverUnion(boxA: number[], boxB: number[]): number {
  const xA = Math.max(boxA[0], boxB[0]);
  const yA = Math.max(boxA[1], boxB[1]);
  const xB = Math.min(boxA[2], boxB[2]);
  const yB = Math.min(boxA[3], boxB[3]);
  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  if (interArea === 0) return 0;
  const boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
  const boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);
  return interArea / (boxAArea + boxBArea - interArea);
}

function nonMaxSuppression(
  boxes: number[][],
  scores: number[],
  iouThreshold: number
): number[] {
  const indices = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  const keep: number[] = [];
  while (indices.length > 0) {
    const idx = indices.shift()!;
    keep.push(idx);
    const remaining: number[] = [];
    for (const j of indices) {
      if (intersectionOverUnion(boxes[idx], boxes[j]) < iouThreshold) {
        remaining.push(j);
      }
    }
    indices.length = 0;
    indices.push(...remaining);
  }
  return keep;
}

// ── Image preprocessing ──

/**
 * Load an image (from URI/data URL) and preprocess it into a float32 tensor
 * with shape [1, 3, 416, 416] normalized to [0, 1].
 */
async function preprocessImage(imageUri: string): Promise<ort.Tensor> {
  // Load image into an HTMLImageElement
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image for YOLO preprocessing'));
    image.src = imageUri;
  });

  // Draw resized image onto canvas
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  // Use white background fill in case image has different aspect ratio
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  ctx.drawImage(img, 0, 0, INPUT_SIZE, INPUT_SIZE);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const pixels = imageData.data; // RGBA, length = 416*416*4

  // Convert to float32 NCHW tensor: [1, 3, 416, 416], normalized 0-1
  const float32Data = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
  for (let y = 0; y < INPUT_SIZE; y++) {
    for (let x = 0; x < INPUT_SIZE; x++) {
      const srcIdx = (y * INPUT_SIZE + x) * 4;
      const dstIdxR = 0 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x; // Channel 0 (R)
      const dstIdxG = 1 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x; // Channel 1 (G)
      const dstIdxB = 2 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x; // Channel 2 (B)
      // Normalize to [0, 1] and convert RGB (canvas is RGBA)
      float32Data[dstIdxR] = pixels[srcIdx] / 255.0;
      float32Data[dstIdxG] = pixels[srcIdx + 1] / 255.0;
      float32Data[dstIdxB] = pixels[srcIdx + 2] / 255.0;
    }
  }

  // Create ONNX tensor
  return new ort.Tensor(float32Data, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

// ── Post-processing ──

/**
 * Parse YOLOv8 output tensor into detections.
 *
 * YOLOv8 ONNX output shape: typically [1, 5, N] or [1, N, 5] where:
 *   - 5 = cx, cy, w, h, class_score (for 1 class)
 *   - Or 6 = cx, cy, w, h, objectness, class_score
 *   - N = number of candidate boxes (depends on input size)
 *
 * The function auto-detects the shape orientation.
 */
function parseDetections(
  data: Float32Array,
  dims: readonly number[]
): { bbox: number[]; confidence: number }[] {
  const detections: { bbox: number[]; confidence: number }[] = [];

  if (dims.length !== 3) {
    console.warn('[yoloDetect] Unexpected output dims:', dims);
    return detections;
  }

  const [dim0, dim1, dim2] = dims;

  // Determine which dimension is channels (5 or 6) and which is candidates
  let candidates: number;
  let channels: number;
  let isTransposed: boolean;

  if (dim1 === 5 || dim1 === 6) {
    // Shape: [1, 5/6, N] — standard format
    channels = dim1;
    candidates = dim2;
    isTransposed = false;
  } else if (dim2 === 5 || dim2 === 6) {
    // Shape: [1, N, 5/6] — transposed format
    channels = dim2;
    candidates = dim1;
    isTransposed = true;
  } else {
    console.warn('[yoloDetect] Unknown output shape:', dims);
    return detections;
  }

  const scoreIdx = channels === 6 ? 5 : 4;
  const hasObjectness = channels === 6;

  for (let i = 0; i < candidates; i++) {
    let cx: number, cy: number, w: number, h: number, score: number;

    if (isTransposed) {
      // Shape [1, N, C]: data[i*C + 0..C-1]
      cx = data[i * channels + 0];
      cy = data[i * channels + 1];
      w = data[i * channels + 2];
      h = data[i * channels + 3];
      score = data[i * channels + scoreIdx];
    } else {
      // Shape [1, C, N]: data[C channels interleaved]
      cx = data[0 * candidates + i];
      cy = data[1 * candidates + i];
      w = data[2 * candidates + i];
      h = data[3 * candidates + i];
      score = data[scoreIdx * candidates + i];
    }

    // Normalize bbox from pixel coords to relative [0, 1]
    cx = cx / INPUT_SIZE;
    cy = cy / INPUT_SIZE;
    w = w / INPUT_SIZE;
    h = h / INPUT_SIZE;

    // Apply sigmoid to get confidence score
    if (hasObjectness) {
      const objScore = sigmoid(data[isTransposed ? (i * channels + 4) : (4 * candidates + i)]);
      const clsScore = sigmoid(score);
      score = objScore * clsScore;
    } else {
      score = sigmoid(score);
    }

    if (score < CONFIDENCE_THRESHOLD) continue;

    // Convert center format to corner format (relative [0, 1])
    const x1 = Math.max(0, cx - w / 2);
    const y1 = Math.max(0, cy - h / 2);
    const x2 = Math.min(1, cx + w / 2);
    const y2 = Math.min(1, cy + h / 2);

    detections.push({
      bbox: [x1, y1, x2, y2],
      confidence: score,
    });
  }

  return detections;
}

// ── Main inference function ──

/**
 * Detect card number region in an image using YOLOv8 ONNX model.
 *
 * @param imageUri - Data URI, blob URL, or regular URL of the image
 * @returns The detected card number bounding box + confidence, or null if none found
 */
export async function detectCardNumber(imageUri: string): Promise<YOLODetection | null> {
  try {
    const ortSession = await getSession();

    // Step 1: Preprocess — load & resize image → float32 tensor
    const inputTensor = await preprocessImage(imageUri);

    // Step 2: Run inference
    const feeds: Record<string, ort.OnnxValue> = {};
    feeds[ortSession.inputNames[0]] = inputTensor;
    const results = await ortSession.run(feeds);

    // Step 3: Get output
    const outputName = ortSession.outputNames[0];
    const outputTensor = results[outputName];
    const outputData = await outputTensor.getData() as Float32Array;
    const outputDims = outputTensor.dims;

    console.log(`[yoloDetect] Output dims:`, outputDims);

    // Step 4: Parse detections
    let detections = parseDetections(outputData, outputDims);

    if (detections.length === 0) {
      console.log('[yoloDetect] No detections above threshold');
      return null;
    }

    // Step 5: Apply NMS
    const boxes = detections.map(d => d.bbox);
    const scores = detections.map(d => d.confidence);
    const keep = nonMaxSuppression(boxes, scores, IOU_THRESHOLD);

    if (keep.length === 0) {
      console.log('[yoloDetect] All detections suppressed by NMS');
      return null;
    }

    // Step 6: Take the highest confidence detection
    const best = detections[keep[0]];
    const [x1_rel, y1_rel, x2_rel, y2_rel] = best.bbox;

    // Step 7: Get original image dimensions
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load original image for scaling'));
      image.src = imageUri;
    });

    const origW = img.width;
    const origH = img.height;

    // Step 8: Scale bbox back to original dimensions
    let finalX = Math.round(x1_rel * origW);
    let finalY = Math.round(y1_rel * origH);
    let finalW = Math.round((x2_rel - x1_rel) * origW);
    let finalH = Math.round((y2_rel - y1_rel) * origH);

    // Step 9: Add 10% margin around the bbox
    const marginX = Math.round(finalW * 0.1);
    const marginY = Math.round(finalH * 0.1);
    finalX = Math.max(0, finalX - marginX);
    finalY = Math.max(0, finalY - marginY);
    finalW = Math.min(origW - finalX, finalW + 2 * marginX);
    finalH = Math.min(origH - finalY, finalH + 2 * marginY);

    console.log(`[yoloDetect] Found card number region: (${finalX}, ${finalY}, ${finalW}x${finalH}) conf=${best.confidence.toFixed(3)}`);

    return {
      bbox: { x: finalX, y: finalY, width: finalW, height: finalH },
      confidence: best.confidence,
    };
  } catch (e) {
    console.error('[yoloDetect] Inference failed:', e);
    return null;
  }
}
