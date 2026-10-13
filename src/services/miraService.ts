import * as ort from "onnxruntime-web/wasm";
import { materialByCode } from "../models/catalog";
import type { Frame } from "./visionService";
import type { Score, VisionHit } from "../models/types";

const INPUT_SIZE = 640;
const SCORE_MIN = 0.32;
const IOU_MAX = 0.5;
const CLASSES = [
  { objectName: "Vaso de vidrio", code: "VID" },
  { objectName: "Lata de metal", code: "MET" },
  { objectName: "Papel", code: "PAP" },
  { objectName: "Plástico", code: "PET" },
  { objectName: "Basura", code: "GEN" },
] as const;

type Detection = {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
  classId: number;
};

let sessionPromise: Promise<ort.InferenceSession> | null = null;
const scratch = { source: null as HTMLCanvasElement | null, letter: null as HTMLCanvasElement | null };

ort.env.wasm.wasmPaths = "/ort/";
ort.env.wasm.numThreads = 1;

export function loadMira() {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create("/models/mira_exp019.onnx", {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    }).catch((error: unknown) => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

export async function detectMira(frame: Frame): Promise<VisionHit | null> {
  if (!scratch.source) scratch.source = document.createElement("canvas");
  scratch.source.width = frame.width;
  scratch.source.height = frame.height;
  const context = scratch.source.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.putImageData(new ImageData(new Uint8ClampedArray(frame.data), frame.width, frame.height), 0, 0);
  return detectMiraFromCanvas(scratch.source);
}

export async function detectMiraFromCanvas(source: HTMLCanvasElement): Promise<VisionHit | null> {
  const started = performance.now();
  const session = await loadMira();
  const prepared = letterboxCanvas(source, INPUT_SIZE);
  const tensor = new ort.Tensor("float32", prepared.data, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const inputName = session.inputNames[0];
  const output = await session.run({ [inputName]: tensor });
  const first = output[session.outputNames[0]];
  const detection = bestDetection(first.data as Float32Array, [...first.dims], prepared, source.width, source.height);
  first.dispose?.();
  tensor.dispose?.();
  if (!detection) return null;
  return toHit(detection, performance.now() - started);
}

function letterboxCanvas(source: HTMLCanvasElement, size: number) {
  if (!scratch.letter) scratch.letter = document.createElement("canvas");
  const canvas = scratch.letter;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No hay lienzo para el modelo");
  context.fillStyle = "rgb(114,114,114)";
  context.fillRect(0, 0, size, size);
  const scale = Math.min(size / source.width, size / source.height);
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);
  const dx = Math.floor((size - width) / 2);
  const dy = Math.floor((size - height) / 2);
  context.drawImage(source, dx, dy, width, height);
  const pixels = context.getImageData(0, 0, size, size).data;
  const data = new Float32Array(3 * size * size);
  const plane = size * size;
  for (let index = 0; index < plane; index += 1) {
    data[index] = pixels[index * 4] / 255;
    data[plane + index] = pixels[index * 4 + 1] / 255;
    data[plane * 2 + index] = pixels[index * 4 + 2] / 255;
  }
  return { data, scale, dx, dy };
}

function bestDetection(output: Float32Array, dims: number[], box: { scale: number; dx: number; dy: number }, frameW: number, frameH: number) {
  const layout = layoutOf(dims);
  const found: Detection[] = [];
  for (let index = 0; index < layout.rows; index += 1) {
    const value = (column: number) => (layout.channelFirst ? output[column * layout.rows + index] : output[index * layout.cols + column]);
    let score = 0;
    let classId = 0;
    if (layout.cols === 6) {
      score = value(4);
      classId = Math.round(value(5));
    } else {
      for (let column = 4; column < layout.cols; column += 1) {
        const next = value(column);
        if (next > score) {
          score = next;
          classId = column - 4;
        }
      }
    }
    if (score < SCORE_MIN || classId < 0 || classId >= CLASSES.length) continue;
    const cx = value(0);
    const cy = value(1);
    const width = value(2);
    const height = value(3);
    const x = (cx - width / 2 - box.dx) / box.scale / frameW;
    const y = (cy - height / 2 - box.dy) / box.scale / frameH;
    const w = width / box.scale / frameW;
    const h = height / box.scale / frameH;
    if (w < 0.04 || h < 0.04 || w > 0.92 || h > 0.92) continue;
    if (w * h > 0.62) continue;
    found.push({
      x: clamp(x, 0, 1),
      y: clamp(y, 0, 1),
      w: clamp(w, 0, 1),
      h: clamp(h, 0, 1),
      score,
      classId,
    });
  }
  found.sort((a, b) => b.score - a.score);
  const kept: Detection[] = [];
  for (const detection of found.slice(0, 40)) {
    if (kept.some((item) => iou(item, detection) > IOU_MAX)) continue;
    kept.push(detection);
    if (kept.length === 3) break;
  }
  return kept[0] ?? null;
}

function layoutOf(dims: number[]) {
  const a = dims[dims.length - 2] || 0;
  const b = dims[dims.length - 1] || 0;
  if (a > 0 && a <= 16 && b > a) return { rows: b, cols: a, channelFirst: true };
  if (b > 0 && b <= 16 && a > b) return { rows: a, cols: b, channelFirst: false };
  return { rows: Math.max(a, b), cols: Math.min(a, b), channelFirst: a < b };
}

function toHit(detection: Detection, inferenceMs: number): VisionHit {
  const known = CLASSES[detection.classId];
  const tallPlastic = known.code === "PET" && detection.h / Math.max(detection.w, 0.01) >= 1.2;
  const code = known.code === "PET" && !tallPlastic ? "HDPE" : known.code;
  const objectName = known.code === "PET" ? (tallPlastic ? "Botella plástica" : "Envase de plástico") : known.objectName;
  const material = materialByCode(code);
  const confidence = clamp(detection.score, 0, 0.99);
  return {
    material,
    confidence,
    bbox: { x: detection.x, y: detection.y, w: detection.w, h: detection.h },
    inferenceMs,
    objectName,
    scores: scoreList(code, confidence),
    segmented: true,
  };
}

function scoreList(code: string, confidence: number): Score[] {
  return ["PET", "HDPE", "MLT", "PAP", "VID", "MET", "ORG", "GEN"].map((item) => ({
    code: item,
    score: item === code ? Math.max(confidence, 0.5) : 0.04,
  }));
}

function iou(a: Detection, b: Detection) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const union = a.w * a.h + b.w * b.h - x * y;
  return union <= 0 ? 0 : (x * y) / union;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
