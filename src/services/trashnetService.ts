import type { Frame } from "./visionService";

export type TrashClass = "cardboard" | "glass" | "metal" | "paper" | "plastic" | "trash";

export type TrashGuess = {
  label: TrashClass;
  confidence: number;
  scores: Record<TrashClass, number>;
};

type TrashModel = {
  classes: TrashClass[];
  size: number;
  hueBins: number;
  mean: number[];
  std: number[];
  weights: number[][];
  bias: number[];
  prototypes: number[][];
  protoLabels: number[];
  trained: number;
  testAccuracy: number;
};

let modelPromise: Promise<TrashModel | null> | null = null;

export function loadTrashnet() {
  if (!modelPromise) {
    modelPromise = fetch("/models/trashnet.json")
      .then((response) => (response.ok ? (response.json() as Promise<TrashModel>) : null))
      .catch(() => null);
  }
  return modelPromise;
}

export async function classifyTrashnet(frame: Frame, box?: { x: number; y: number; w: number; h: number }): Promise<TrashGuess | null> {
  const model = await loadTrashnet();
  if (!model) return null;
  const features = extractCrop(frame, box, model.size, model.hueBins);
  const z = features.map((value, index) => (value - model.mean[index]) / (model.std[index] || 1));
  const logits = model.weights.map((row, rowIndex) => row.reduce((sum, weight, index) => sum + weight * z[index], model.bias[rowIndex]));
  const votes = votePrototypes(z, model.prototypes, model.protoLabels, model.classes.length);
  const fused = logits.map((value, index) => value + 0.45 * votes[index]);
  const scores = softmax(fused);
  let best = 0;
  for (let index = 1; index < scores.length; index += 1) if (scores[index] > scores[best]) best = index;
  const table = Object.fromEntries(model.classes.map((name, index) => [name, scores[index]])) as Record<TrashClass, number>;
  return { label: model.classes[best], confidence: clamp(scores[best], 0, 0.99), scores: table };
}

function extractCrop(frame: Frame, box: { x: number; y: number; w: number; h: number } | undefined, size: number, hueBins: number) {
  const x0 = box ? Math.max(0, Math.floor(box.x * frame.width)) : 0;
  const y0 = box ? Math.max(0, Math.floor(box.y * frame.height)) : 0;
  const x1 = box ? Math.min(frame.width, Math.ceil((box.x + box.w) * frame.width)) : frame.width;
  const y1 = box ? Math.min(frame.height, Math.ceil((box.y + box.h) * frame.height)) : frame.height;
  const srcW = Math.max(1, x1 - x0);
  const srcH = Math.max(1, y1 - y0);
  const hues = new Array(hueBins).fill(0);
  let hueN = 0;
  let satSum = 0;
  let satSq = 0;
  let highlights = 0;
  let valSum = 0;
  let valSq = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let rSq = 0;
  let gSq = 0;
  let bSq = 0;
  let white = 0;
  let brown = 0;
  let green = 0;
  let blue = 0;
  let yellow = 0;
  let gray = 0;
  let reds = 0;
  let dark = 0;
  let objectN = 0;
  let edges = 0;
  let count = 0;
  let lastLum = 0;
  const quadrants = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const quadCount = [0, 0, 0, 0];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const sx = x0 + Math.min(srcW - 1, Math.floor((col * srcW) / size));
      const sy = y0 + Math.min(srcH - 1, Math.floor((row * srcH) / size));
      const index = (sy * frame.width + sx) * 4;
      const red = frame.data[index];
      const greenCh = frame.data[index + 1];
      const blueCh = frame.data[index + 2];
      const { h, s, v } = rgbToHsv(red, greenCh, blueCh);
      count += 1;
      satSum += s;
      satSq += s * s;
      if (v > 0.9) highlights += 1;
      valSum += v;
      valSq += v * v;
      rSum += red;
      gSum += greenCh;
      bSum += blueCh;
      rSq += red * red;
      gSq += greenCh * greenCh;
      bSq += blueCh * blueCh;
      if (s > 0.12 && v > 0.15) {
        hues[Math.min(hueBins - 1, Math.floor(h / (360 / hueBins)))] += 1;
        hueN += 1;
      }
      if (v > 0.78 && s < 0.14) white += 1;
      else objectN += 1;
      if (h >= 12 && h <= 48 && s > 0.22 && v > 0.18 && v < 0.82) brown += 1;
      if (h >= 75 && h <= 165 && s > 0.22 && v > 0.2) green += 1;
      if (h >= 175 && h <= 255 && s > 0.1 && v > 0.45) blue += 1;
      if (h >= 40 && h <= 75 && s > 0.28 && v > 0.4) yellow += 1;
      if (s < 0.12 && v > 0.22 && v < 0.78) gray += 1;
      if (red > 115 && red > greenCh * 1.28 && red > blueCh * 1.28) reds += 1;
      if (v < 0.25) dark += 1;
      const lum = red + greenCh + blueCh;
      if (col > 0 && Math.abs(lum - lastLum) > 48) edges += 1;
      lastLum = lum;
      const quad = (row < size / 2 ? 0 : 2) + (col < size / 2 ? 0 : 1);
      quadrants[quad * 3] += red;
      quadrants[quad * 3 + 1] += greenCh;
      quadrants[quad * 3 + 2] += blueCh;
      quadCount[quad] += 1;
    }
  }
  const safe = Math.max(count, 1);
  const hueSafe = Math.max(hueN, 1);
  const meanV = valSum / safe;
  const satMean = satSum / safe;
  return [
    ...hues.map((bin) => bin / hueSafe),
    satMean,
    meanV,
    Math.sqrt(Math.max(0, valSq / safe - meanV * meanV)),
    white / safe,
    brown / safe,
    green / safe,
    blue / safe,
    yellow / safe,
    gray / safe,
    reds / safe,
    dark / safe,
    objectN / safe,
    edges / (safe * 2),
    rSum / (safe * 255),
    gSum / (safe * 255),
    bSum / (safe * 255),
    Math.sqrt(Math.max(0, rSq / safe - (rSum / safe) ** 2)) / 255,
    Math.sqrt(Math.max(0, gSq / safe - (gSum / safe) ** 2)) / 255,
    Math.sqrt(Math.max(0, bSq / safe - (bSum / safe) ** 2)) / 255,
    Math.sqrt(Math.max(0, satSq / safe - satMean * satMean)),
    highlights / safe,
    ...quadrants.map((value, index) => value / (255 * Math.max(1, quadCount[Math.floor(index / 3)]))),
  ];
}

function rgbToHsv(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function votePrototypes(z: number[], prototypes: number[][], labels: number[], classes: number) {
  const votes = new Array(classes).fill(0);
  if (!prototypes.length) return votes;
  const dist = prototypes.map((center, index) => {
    let sum = 0;
    for (let dim = 0; dim < z.length; dim += 1) {
      const delta = z[dim] - center[dim];
      sum += delta * delta;
    }
    return { index, sum };
  });
  dist.sort((a, b) => a.sum - b.sum);
  for (const item of dist.slice(0, 5)) votes[labels[item.index]] += 1;
  return votes;
}

function softmax(logits: number[]) {
  const peak = Math.max(...logits);
  const exp = logits.map((value) => Math.exp(value - peak));
  const sum = exp.reduce((total, value) => total + value, 0) || 1;
  return exp.map((value) => value / sum);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
