import { materialByCode } from "../models/catalog";
import type { BBox, VisionHit } from "../models/types";

const META_KEY = "ecoscan.vision";
const CODES = ["PET", "HDPE", "MLT", "PAP", "VID", "MET", "ORG", "GEN"] as const;
export type SampleKind = (typeof CODES)[number];

export type Frame = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

type Features = {
  brown: number;
  green: number;
  blue: number;
  orange: number;
  yellow: number;
  white: number;
  gray: number;
  red: number;
  ink: number;
  satMean: number;
  valMean: number;
  lumStd: number;
  variety: number;
  aspect: number;
};

export class VisionEngine {
  private last: VisionHit | null = null;
  private misses = 0;
  frames = 0;
  lastMs = 0;

  analyze(frame: Frame): VisionHit | null {
    const started = performance.now();
    const hit = detectFrame(frame);
    const ms = performance.now() - started;
    this.frames += 1;
    this.lastMs = ms;
    if (!hit) {
      this.misses += 1;
      if (this.misses > 2) this.last = null;
      return this.last ? { ...this.last, inferenceMs: ms } : null;
    }
    this.misses = 0;
    hit.inferenceMs = ms;
    if (this.last) {
      const jump = boxJump(this.last.bbox, hit.bbox);
      const follow = jump > 0.06 ? 1 : 0.9;
      const samePlace = jump < 0.12 && boxOverlap(this.last.bbox, hit.bbox) > 0.35;
      if (samePlace && this.last.material.code !== hit.material.code && hit.confidence + 0.15 < this.last.confidence) {
        this.last = { ...this.last, bbox: mixBox(this.last.bbox, hit.bbox, follow), inferenceMs: ms };
        rememberVision(ms, this.last.confidence);
        return this.last;
      }
      hit.bbox = mixBox(this.last.bbox, hit.bbox, follow);
    }
    this.last = hit;
    rememberVision(ms, hit.confidence);
    return hit;
  }
}

export function rememberVision(ms: number, confidence: number) {
  localStorage.setItem(META_KEY, JSON.stringify({ ms: Math.max(1, Math.round(ms)), confidence, at: Date.now() }));
}

export function readVisionMeta(): { ms: number; confidence: number; at: number } | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as { ms: number; confidence: number; at: number }) : null;
  } catch {
    return null;
  }
}

export function evaluateSample(kind: SampleKind): VisionHit | null {
  return detectFrame(buildSample(kind));
}

export function sampleKinds(): SampleKind[] {
  return [...CODES];
}

export function detectFrame(frame: Frame): VisionHit | null {
  const { data, width, height } = frame;
  if (width < 16 || height < 16) return null;
  const border = borderColor(data, width, height);
  let sum = 0;
  let seen = 0;
  for (let index = 0; index < data.length; index += 16) {
    sum += data[index] + data[index + 1] + data[index + 2];
    seen += 1;
  }
  if (sum / (seen * 3 * 255) < 0.07) return null;
  const bottle = tryLockBottle(frame);
  if (bottle) return bottle;
  const sheet = tryLockSheet(frame);
  if (sheet) return sheet;
  const shaped = tryLockShape(frame);
  if (shaped) return shaped;

  const columns = new Uint16Array(width);
  let capMinX = width;
  let capMinY = height;
  let capMaxX = 0;
  let capMaxY = 0;
  let capCount = 0;

  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      if (isCapPixel(red, green, blue)) {
        capCount += 1;
        if (x < capMinX) capMinX = x;
        if (y < capMinY) capMinY = y;
        if (x > capMaxX) capMaxX = x;
        if (y > capMaxY) capMaxY = y;
      }
      if (isPackagingPixel(red, green, blue, border)) columns[x] += 1;
    }
  }

  const area = width * height;
  const capW = capMaxX - capMinX;
  const capH = capMaxY - capMinY;
  const capCompact =
    capCount >= 8 &&
    capCount < area * 0.07 &&
    capW > 2 &&
    capH > 2 &&
    capW < width * 0.36 &&
    capH < height * 0.32 &&
    capCount > capW * capH * 0.22;
  const foundCap = capCompact && !capSitsOnLabel(data, width, border, capMinX, capMinY, capMaxX, capMaxY);

  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = 0;
  let segmented = false;
  let clearBody = false;
  let sheetMode = false;

  if (foundCap) {
    const center = (capMinX + capMaxX) / 2;
    const half = Math.max(capW * 1.25, width * 0.07);
    x0 = Math.max(0, Math.round(center - half));
    x1 = Math.min(width - 1, Math.round(center + half));
    y0 = Math.max(0, capMinY - 3);
    y1 = Math.min(height - 1, capMaxY + Math.round(height * 0.6));
    segmented = true;
    clearBody = true;
  } else {
    const span = densestSpan(columns, Math.max(8, Math.round(width * 0.08)), Math.round(width * 0.42));
    const spanRatio = span ? span.sum / area : 0;
    if (span && spanRatio > 0.025 && spanRatio < 0.55) {
      let minY = height;
      let maxY = 0;
      for (let y = 2; y < height - 2; y += 1) {
        for (let x = span.x0; x <= span.x1; x += 1) {
          const index = (y * width + x) * 4;
          if (!isPackagingPixel(data[index], data[index + 1], data[index + 2], border)) continue;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (maxY > minY) {
        const padX = Math.round((span.x1 - span.x0) * 0.08);
        x0 = Math.max(0, span.x0 - padX);
        x1 = Math.min(width - 1, span.x1 + padX);
        y0 = Math.max(0, minY - 4);
        y1 = Math.min(height - 1, maxY + 4);
        const boxArea = ((x1 - x0) * (y1 - y0)) / area;
        const fullBleed = y0 <= 4 && y1 >= height - 6 && x1 - x0 > width * 0.38;
        segmented = boxArea > 0.03 && boxArea < 0.62 && !fullBleed;
      }
    }
  }

  if (!foundCap) {
    const sheet = findSheet(data, width, height);
    if (sheet) {
      const sheetAspect = (sheet.y1 - sheet.y0) / Math.max(1, sheet.x1 - sheet.x0);
      if (sheetAspect < 1.72 || !segmented) {
        x0 = sheet.x0;
        y0 = sheet.y0;
        x1 = sheet.x1;
        y1 = sheet.y1;
        segmented = true;
        clearBody = false;
        sheetMode = true;
      }
    }
  }

  if (!segmented) return null;

  const features = measure(data, width, x0, y0, x1, y1, border, sheetMode ? "sheet" : clearBody ? "clear" : "object");
  if (looksLikeClothing(features)) return null;
  if (!clearBody && features.white < 0.34 && features.valMean < 0.75 && features.satMean < 0.09 && features.lumStd < 0.075 && features.red < 0.012 && features.variety <= 1) return null;
  const ranked = scoreAll(features, foundCap);
  const best = ranked[0];
  const second = ranked[1];
  if (best.score < 0.28) return null;
  const margin = best.score - second.score;
  let confidence = 0.56 + Math.min(best.score, 1) * 0.24 + Math.min(Math.max(margin, 0), 0.45) * 0.48;
  confidence = clamp(confidence, 0.52, 0.98);
  const material = materialByCode(best.code);
  return {
    material,
    confidence,
    bbox: {
      x: x0 / width,
      y: y0 / height,
      w: (x1 - x0) / width,
      h: (y1 - y0) / height,
    },
    inferenceMs: 0,
    objectName: nameFor(best.code, features, material.objectName),
    scores: ranked,
    segmented,
  };
}

function scoreAll(features: Features, capped = false): { code: string; score: number }[] {
  const tall = features.aspect > 1.2 ? 1 : features.aspect > 0.9 ? 0.55 : 0.15;
  const wide = features.aspect < 1.25 && features.aspect > 0.55 ? 1 : 0.25;
  let pet = tall * 0.2 + features.blue * 0.34 + (1 - features.brown) * 0.1 + (features.lumStd > 0.04 && features.lumStd < 0.25 ? 0.12 : 0.02);
  let hdpe = features.white * 0.5 + (features.lumStd < 0.1 ? 0.22 : 0.04) + (features.satMean < 0.2 ? 0.16 : 0) + (1 - features.blue) * 0.08;
  let mlt = features.white * 0.22 + (features.variety >= 3 ? 0.28 : 0) + wide * 0.16 + (features.brown < 0.25 ? 0.1 : 0);
  let pap = features.brown * 0.62 + (features.satMean > 0.18 && features.satMean < 0.7 ? 0.14 : 0) + (features.valMean < 0.75 ? 0.1 : 0) + wide * 0.08;
  let vid = features.green * 0.55 + (features.lumStd < 0.12 ? 0.2 : 0.04) + tall * 0.12;
  let met = features.gray * 0.34 + (features.satMean < 0.14 && features.valMean > 0.4 ? 0.12 : 0) + (features.brown < 0.15 ? 0.06 : 0);
  let org = (features.orange + features.yellow) * 0.48 + (features.white < 0.25 ? 0.14 : 0) + (features.green * 0.15);
  let gen = (features.variety >= 5 ? 0.2 : 0.04) + (features.lumStd > 0.18 ? 0.16 : 0);

  if (features.brown > 0.4 && features.valMean < 0.78) pap += 0.34;
  if (features.green > 0.36 && features.lumStd < 0.16 && features.red < 0.03) vid += 0.32;
  if (features.gray > 0.42 && features.valMean > 0.4 && features.valMean < 0.84 && features.white < 0.38 && features.red < 0.02 && features.blue < 0.12 && features.variety <= 3) met += 0.4;
  if (features.orange + features.yellow > 0.38 && features.white < 0.28 && features.brown < 0.45) org += 0.28;
  if (features.aspect < 1.4 && features.white > 0.42 && features.variety >= 3 && features.variety <= 6 && features.brown < 0.22) mlt += 0.34;
  if (features.white < 0.32) mlt -= 0.22;
  if (features.variety >= 4 && features.white < 0.28 && features.lumStd > 0.12 && features.brown < 0.32) gen += 0.55;
  if (features.white > 0.58 && features.lumStd < 0.1 && features.blue < 0.18 && features.red < 0.02 && features.variety <= 2) hdpe += 0.36;
  if (features.blue > 0.2 && features.aspect > 1 && features.brown < 0.18) pet += 0.34;
  const money = features.yellow + features.brown > 0.16 && features.satMean > 0.1;
  if (!money && features.aspect > 1.02 && features.red > 0.008 && features.red < 0.2 && features.variety <= 3 && features.valMean > 0.52 && features.brown < 0.28 && features.gray < 0.58) {
    pet += 0.78;
    met -= 0.6;
  }
  if (features.aspect > 1.2 && features.valMean > 0.6 && features.satMean < 0.2 && features.gray < 0.4 && features.brown < 0.16 && features.variety <= 2) pet += 0.36;
  if (features.aspect > 1.15 && features.valMean > 0.62 && features.gray < 0.48 && features.brown < 0.22 && (features.white + features.blue) > 0.28) pet += 0.28;
  if (features.red > 0.015 || features.valMean > 0.74 || features.valMean < 0.38) met -= 0.32;
  if (features.variety >= 5 && features.white < 0.32 && features.lumStd > 0.15 && features.brown < 0.35) gen += 0.38;
  if (features.variety >= 4 && features.white < 0.4 && !(features.aspect > 1.4 && features.red > 0.006)) pet -= 0.45;
  if (features.aspect > 1.4) mlt -= 0.4;
  if (!money && features.aspect > 1.45 && features.red > 0.006 && features.red < 0.55 && features.valMean > 0.45 && features.brown < 0.3 && features.green < 0.4) {
    pet += 0.95;
    mlt -= 0.85;
    met -= 0.45;
    hdpe -= 0.3;
  }
  if (capped && !money && features.aspect > 1.15 && features.green < 0.4 && features.brown < 0.35) {
    pet += 1.05;
    mlt -= 0.95;
    met -= 0.55;
    hdpe -= 0.4;
    pap -= 0.45;
  }
  const sheetShape = features.aspect < 1.7;
  if (sheetShape && features.white > 0.4 && features.ink > 0.04 && features.ink < 0.42 && features.satMean < 0.24 && features.brown < 0.28 && features.variety <= 3 && features.red < 0.04) {
    pap += 0.95;
    hdpe -= 0.55;
    met -= 0.45;
    pet -= 0.3;
    gen -= 0.15;
  }
  if (sheetShape && features.white > 0.55 && features.ink < 0.028 && features.satMean < 0.12 && features.lumStd >= 0.028 && features.lumStd < 0.22 && features.valMean > 0.72 && features.brown < 0.12 && features.blue < 0.12 && features.gray < 0.42) {
    gen += 0.86;
    hdpe -= 0.6;
    pap -= 0.3;
    pet -= 0.35;
    met -= 0.4;
  }
  if (features.white > 0.45 && features.ink > 0.08 && features.ink < 0.45 && features.blue < 0.08 && features.red < 0.03 && features.satMean < 0.2 && features.brown < 0.25 && features.aspect < 2.1) {
    pap += 0.9;
    pet -= 0.45;
    hdpe -= 0.4;
    met -= 0.35;
  }
  if (features.aspect > 1.65 && features.white > 0.3 && features.brown < 0.2 && features.green < 0.2) {
    pet += 0.42;
    hdpe -= 0.62;
    met -= 0.3;
  }
  if (features.aspect > 1.4 && features.valMean > 0.52 && features.white > 0.16 && features.gray < 0.6 && features.ink < 0.14 && (features.blue > 0.06 || features.red > 0.012 || (features.ink > 0.012 && features.ink < 0.08))) {
    pet += 0.5;
    met -= 0.55;
    hdpe -= 0.32;
  }
  if (features.yellow > 0.08 && features.ink > 0.04 && features.ink < 0.45 && features.satMean > 0.1 && features.white < 0.65 && features.variety <= 4 && features.red < 0.2) {
    gen += 1.15;
    pap -= 0.9;
    pet -= 0.55;
    org -= 0.8;
    hdpe -= 0.3;
  }

  const table = [
    ["PET", pet],
    ["HDPE", hdpe],
    ["MLT", mlt],
    ["PAP", pap],
    ["VID", vid],
    ["MET", met],
    ["ORG", org],
    ["GEN", gen],
  ] as const;
  return table
    .map(([code, score]) => ({ code, score: clamp(score, 0, 1.4) }))
    .sort((a, b) => b.score - a.score);
}

function measure(
  data: Uint8ClampedArray,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  border: [number, number, number],
  mode: "object" | "clear" | "sheet",
): Features {
  let count = 0;
  let satSum = 0;
  let valSum = 0;
  let valSq = 0;
  let brown = 0;
  let green = 0;
  let blue = 0;
  let orange = 0;
  let yellow = 0;
  let white = 0;
  let gray = 0;
  let redCount = 0;
  let inkCount = 0;
  const bins = Array.from({ length: 12 }, () => 0);
  let chromatic = 0;

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const greenCh = data[index + 1];
      const blueCh = data[index + 2];
      if (isSkin(red, greenCh, blueCh)) continue;
      if (mode !== "sheet" && isDarkCloth(red, greenCh, blueCh)) {
        const max = Math.max(red, greenCh, blueCh);
        const min = Math.min(red, greenCh, blueCh);
        const sat = max === 0 ? 0 : (max - min) / max;
        if (max / 255 < 0.5 && sat < 0.32) inkCount += 1;
        continue;
      }
      if (mode === "object" && distance(red, greenCh, blueCh, border) < 30) continue;
      const hsv = rgbToHsv(red, greenCh, blueCh);
      count += 1;
      satSum += hsv.s;
      valSum += hsv.v;
      valSq += hsv.v * hsv.v;
      if (hsv.s > 0.18 && hsv.v > 0.16) {
        bins[Math.min(11, Math.floor(hsv.h / 30))] += 1;
        chromatic += 1;
      }
      if (hsv.h >= 12 && hsv.h <= 48 && hsv.s > 0.22 && hsv.v > 0.18 && hsv.v < 0.82) brown += 1;
      if (hsv.h >= 75 && hsv.h <= 165 && hsv.s > 0.22 && hsv.v > 0.2) green += 1;
      if (hsv.h >= 175 && hsv.h <= 255 && hsv.s > 0.1 && hsv.v > 0.45) blue += 1;
      if (hsv.h >= 8 && hsv.h <= 40 && hsv.s > 0.4 && hsv.v > 0.4) orange += 1;
      if (hsv.h >= 40 && hsv.h <= 75 && hsv.s > 0.28 && hsv.v > 0.4) yellow += 1;
      if (hsv.v > 0.78 && hsv.s < 0.14) white += 1;
      if (hsv.s < 0.12 && hsv.v > 0.22 && hsv.v < 0.78) gray += 1;
      if (red > 115 && red > greenCh * 1.28 && red > blueCh * 1.28) redCount += 1;
      if (hsv.v < 0.5 && hsv.s < 0.3) inkCount += 1;
    }
  }

  const safe = Math.max(count, 1);
  const valMean = valSum / safe;
  const lumStd = Math.sqrt(Math.max(0, valSq / safe - valMean * valMean));
  const variety = bins.filter((bin) => chromatic > 0 && bin / chromatic > 0.08).length;
  return {
    brown: brown / safe,
    green: green / safe,
    blue: blue / safe,
    orange: orange / safe,
    yellow: yellow / safe,
    white: white / safe,
    gray: gray / safe,
    red: redCount / safe,
    ink: inkCount / safe,
    satMean: satSum / safe,
    valMean,
    lumStd,
    variety,
    aspect: (y1 - y0) / Math.max(1, x1 - x0),
  };
}

function nameFor(code: string, features: Features, fallback: string) {
  if (code === "GEN" && features.yellow > 0.08 && features.ink > 0.04 && features.satMean > 0.1 && features.white < 0.65 && features.variety <= 4) return "Billete";
  if (code === "PAP" && features.white > 0.35 && features.brown < 0.3) return "Hoja de papel";
  if (code === "GEN" && features.white > 0.5 && features.ink < 0.08 && features.satMean < 0.18) return "Papel higiénico";
  return fallback;
}

function isPagePixel(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const sat = max === 0 ? 0 : (max - min) / max;
  return max / 255 > 0.7 && sat < 0.16;
}

function isMarkPixel(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const sat = max === 0 ? 0 : (max - min) / max;
  return max / 255 < 0.52 && max / 255 > 0.04 && sat < 0.32;
}

function findSheet(data: Uint8ClampedArray, width: number, height: number) {
  const columns = new Uint16Array(width);
  const top = new Uint16Array(width);
  const bottom = new Uint16Array(width);
  top.fill(height);
  let marks = 0;
  let edges = 0;

  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const page = isPagePixel(red, green, blue);
      const left = index - 4;
      const gradient = Math.abs(red - data[left]) + Math.abs(green - data[left + 1]) + Math.abs(blue - data[left + 2]);
      let onPage = false;
      if (inkOnPaper(data, width, index, isPagePixel)) onPage = true;
      if (!onPage && !(page && gradient > 28)) continue;
      columns[x] += onPage ? 2 : 1;
      if (y < top[x]) top[x] = y;
      if (y > bottom[x]) bottom[x] = y;
      if (onPage) marks += 1;
      else edges += 1;
    }
  }

  if (marks < 18) return null;
  const span = densestSpan(columns, Math.max(10, Math.round(width * 0.12)), Math.round(width * 0.72));
  if (!span || span.sum < 24) return null;
  let y0 = height;
  let y1 = 0;
  for (let x = span.x0; x <= span.x1; x += 1) {
    if (bottom[x] <= top[x]) continue;
    if (top[x] < y0) y0 = top[x];
    if (bottom[x] > y1) y1 = bottom[x];
  }
  if (y1 <= y0) return null;
  const padX = Math.round((span.x1 - span.x0) * 0.06);
  const x0 = Math.max(0, span.x0 - padX);
  const x1 = Math.min(width - 1, span.x1 + padX);
  y0 = Math.max(0, y0 - 3);
  y1 = Math.min(height - 1, y1 + 3);
  if ((y1 - y0) < height * 0.16 || (x1 - x0) < width * 0.1) return null;
  if (y0 <= 3 && y1 < height * 0.42 && marks < 20) return null;

  let pageCount = 0;
  let seen = 0;
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      const index = (y * width + x) * 4;
      seen += 1;
      if (isPagePixel(data[index], data[index + 1], data[index + 2])) pageCount += 1;
    }
  }
  if (!seen || pageCount / seen < 0.45) return null;
  return { x0, y0, x1, y1, marks };
}

function looksLikeClothing(features: Features) {
  return (
    features.valMean < 0.36 &&
    features.satMean < 0.22 &&
    features.red < 0.02 &&
    features.brown < 0.16 &&
    features.green < 0.1 &&
    features.blue < 0.1 &&
    features.white < 0.12
  );
}

function inkOnPaper(
  data: Uint8ClampedArray,
  width: number,
  index: number,
  paper: (red: number, green: number, blue: number) => boolean,
) {
  if (!isMarkPixel(data[index], data[index + 1], data[index + 2])) return false;
  let above = false;
  let below = false;
  let left = false;
  let right = false;
  for (let step = 1; step <= 5; step += 1) {
    const up = index - width * 4 * step;
    const down = index + width * 4 * step;
    const west = index - step * 4;
    const east = index + step * 4;
    if (up >= 0 && paper(data[up], data[up + 1], data[up + 2])) above = true;
    if (down + 2 < data.length && paper(data[down], data[down + 1], data[down + 2])) below = true;
    if (west >= 0 && paper(data[west], data[west + 1], data[west + 2])) left = true;
    if (east + 2 < data.length && paper(data[east], data[east + 1], data[east + 2])) right = true;
  }
  return (above && below) || (left && right);
}

function isBlocPaper(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const sat = max === 0 ? 0 : (max - min) / max;
  return max / 255 > 0.55 && sat < 0.42;
}

function tryLockSheet(frame: Frame): VisionHit | null {
  const { data, width, height } = frame;
  const border = borderColor(data, width, height);
  const borderPaper = isBlocPaper(border[0], border[1], border[2]);
  const columns = new Uint16Array(width);
  const top = new Uint16Array(width);
  const bottom = new Uint16Array(width);
  top.fill(height);
  let ink = 0;
  const inkColumns = new Uint16Array(width);

  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const paper = isBlocPaper(red, green, blue);
      if (inkOnPaper(data, width, index, isBlocPaper)) {
        ink += 1;
        inkColumns[x] += 1;
      }
      if (!paper || (!borderPaper && distance(red, green, blue, border) < 16)) continue;
      columns[x] += 1;
      if (y < top[x]) top[x] = y;
      if (y > bottom[x]) bottom[x] = y;
    }
  }

  let x0 = -1;
  let x1 = -1;
  let runStart = -1;
  let bestStart = 0;
  let bestEnd = 0;
  const minColumn = height * 0.22;
  for (let x = 0; x < width; x += 1) {
    if (columns[x] >= minColumn) {
      if (runStart < 0) runStart = x;
      if (x - runStart > bestEnd - bestStart) {
        bestStart = runStart;
        bestEnd = x;
      }
    } else if (columns[x] < minColumn * 0.4) {
      runStart = -1;
    }
  }
  x0 = bestStart;
  x1 = bestEnd;
  if (x1 - x0 < width * 0.4) return null;

  let y0 = height;
  let y1 = 0;
  for (let x = x0; x <= x1; x += 1) {
    if (bottom[x] <= top[x]) continue;
    if (top[x] < y0) y0 = top[x];
    if (bottom[x] > y1) y1 = bottom[x];
  }
  if (y1 - y0 < height * 0.38 || ink < 20) return null;
  let marked = 0;
  for (let x = x0; x <= x1; x += 1) if (inkColumns[x] > 0) marked += 1;
  const span = Math.max(1, x1 - x0);
  if (marked < span * 0.28) return null;
  if (x0 <= 2 && x1 >= width - 3 && marked < span * 0.5) return null;

  const material = materialByCode("PAP");
  return {
    material,
    confidence: 0.92,
    bbox: {
      x: x0 / width,
      y: y0 / height,
      w: (x1 - x0) / width,
      h: (y1 - y0) / height,
    },
    inferenceMs: 0,
    objectName: "Hoja de papel",
    scores: [
      { code: "PAP", score: 1.15 },
      { code: "PET", score: 0.12 },
      { code: "GEN", score: 0.1 },
      { code: "HDPE", score: 0.08 },
      { code: "MLT", score: 0.06 },
      { code: "ORG", score: 0.04 },
      { code: "MET", score: 0.02 },
      { code: "VID", score: 0.02 },
    ],
    segmented: true,
  };
}

function shapeHit(code: string, name: string, confidence: number, x0: number, y0: number, x1: number, y1: number, width: number, height: number): VisionHit {
  const material = materialByCode(code);
  return {
    material,
    confidence,
    bbox: { x: x0 / width, y: y0 / height, w: (x1 - x0) / width, h: (y1 - y0) / height },
    inferenceMs: 0,
    objectName: name,
    scores: [
      { code, score: 1.1 },
      { code: "GEN", score: code === "GEN" ? 1.1 : 0.08 },
      { code: "HDPE", score: code === "HDPE" ? 1.1 : 0.05 },
      { code: "PAP", score: 0.04 },
      { code: "PET", score: 0.04 },
      { code: "MET", score: 0.03 },
      { code: "ORG", score: 0.02 },
      { code: "VID", score: 0.02 },
    ],
    segmented: true,
  };
}

function tryLockShape(frame: Frame): VisionHit | null {
  const { data, width, height } = frame;
  const border = borderColor(data, width, height);
  const columns = new Uint16Array(width);
  const rows = new Uint16Array(height);
  const top = new Uint16Array(width);
  const bottom = new Uint16Array(width);
  top.fill(height);

  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      if (isSkin(red, green, blue)) continue;
      if (distance(red, green, blue, border) < 28) continue;
      columns[x] += 1;
      rows[y] += 1;
      if (y < top[x]) top[x] = y;
      if (y > bottom[x]) bottom[x] = y;
    }
  }

  const vertical = densestSpan(columns, Math.max(4, Math.round(width * 0.03)), Math.round(width * 0.46));
  if (vertical && vertical.sum > height * 4) {
    let y0 = height;
    let y1 = 0;
    for (let x = vertical.x0; x <= vertical.x1; x += 1) {
      if (bottom[x] <= top[x]) continue;
      if (top[x] < y0) y0 = top[x];
      if (bottom[x] > y1) y1 = bottom[x];
    }
    const boxW = vertical.x1 - vertical.x0;
    const boxH = y1 - y0;
    if (boxW > 3 && boxH > 8) {
      const named = nameByShape(data, width, vertical.x0, y0, vertical.x1, y1);
      if (named) return shapeHit(named.code, named.name, named.confidence, vertical.x0, y0, vertical.x1, y1, width, height);
    }
  }

  let run = -1;
  let bestStart = 0;
  let bestEnd = 0;
  const thick = width * 0.045;
  for (let y = 0; y < height; y += 1) {
    if (rows[y] > thick) {
      if (run < 0) run = y;
      if (y - run > bestEnd - bestStart) {
        bestStart = run;
        bestEnd = y;
      }
    } else if (rows[y] < thick * 0.35) run = -1;
  }
  if (bestEnd - bestStart > height * 0.04 && bestEnd - bestStart < height * 0.16) {
    let x0 = width;
    let x1 = 0;
    for (let y = bestStart; y <= bestEnd; y += 1) {
      for (let x = 2; x < width - 2; x += 1) {
        const index = (y * width + x) * 4;
        if (distance(data[index], data[index + 1], data[index + 2], border) < 28) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
    }
    if (x1 - x0 > width * 0.35) {
      const named = nameByShape(data, width, x0, bestStart, x1, bestEnd);
      if (named) return shapeHit(named.code, named.name, named.confidence, x0, bestStart, x1, bestEnd, width, height);
    }
  }
  return null;
}

function nameByShape(data: Uint8ClampedArray, width: number, x0: number, y0: number, x1: number, y1: number) {
  const boxW = Math.max(1, x1 - x0);
  const boxH = Math.max(1, y1 - y0);
  const aspect = boxH / boxW;
  const horizontal = boxW > boxH;
  const length = Math.max(boxW, boxH);
  const thickness = Math.min(boxW, boxH);
  const frame = data.length / 4;
  const frameW = width;
  const frameH = frame / width;
  let count = 0;
  let yellow = 0;
  let dark = 0;
  let changes = 0;
  let last = -1;
  const step = horizontal ? 2 : 2;
  const axis = horizontal
    ? { from: x0, to: x1, fixed: Math.round((y0 + y1) / 2), across: true }
    : { from: y0, to: y1, fixed: Math.round((x0 + x1) / 2), across: false };
  for (let cursor = axis.from; cursor <= axis.to; cursor += step) {
    const index = axis.across ? (axis.fixed * frameW + cursor) * 4 : (cursor * frameW + axis.fixed) * 4;
    if (index < 0 || index + 2 >= data.length) continue;
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const sat = max === 0 ? 0 : (max - min) / max;
    count += 1;
    if (max / 255 > 0.45 && sat > 0.25 && red > blue && green > blue) yellow += 1;
    if (max / 255 < 0.34) dark += 1;
    if (last >= 0 && Math.abs(max - last) > 28) changes += 1;
    last = max;
  }
  if (!count) return null;
  const thin = thickness < frameW * 0.1 && length > frameH * 0.38 && (horizontal ? boxW / boxH : aspect) > 4;
  if (thin && yellow / count > 0.4) return { code: "GEN", name: "Lápiz", confidence: 0.9 };
  if (thin) return { code: "GEN", name: "Lapicero", confidence: 0.88 };
  const remote = thickness < frameW * 0.24 && thickness > frameW * 0.05 && (horizontal ? boxW / boxH : aspect) > 2.35 && changes >= 6;
  if (remote && dark / count < 0.85) return { code: "GEN", name: "Control remoto", confidence: 0.86 };
  const phone = !horizontal && aspect > 1.45 && aspect < 2.5 && dark / count > 0.58 && boxW > frameW * 0.12 && boxW < frameW * 0.48 && boxH > frameH * 0.28 && boxH < frameH * 0.86;
  if (phone) return { code: "GEN", name: "Celular", confidence: 0.88 };
  return null;
}

function isLooseRed(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const sat = max === 0 ? 0 : (max - min) / max;
  return red > 90 && red > green + 28 && red > blue + 22 && red > green * 1.35 && sat > 0.34 && max / 255 > 0.25;
}

function printedSheetBehind(data: Uint8ClampedArray, width: number, height: number) {
  const border = borderColor(data, width, height);
  const borderPaper = isBlocPaper(border[0], border[1], border[2]);
  const paper = new Uint8Array(width);
  const ink = new Uint8Array(width);
  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 1) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      if (isBlocPaper(red, green, blue) && (borderPaper || distance(red, green, blue, border) >= 16)) paper[x] = 1;
      if (inkOnPaper(data, width, index, isBlocPaper)) ink[x] = 1;
    }
  }
  let run = -1;
  let bestStart = 0;
  let bestEnd = 0;
  for (let x = 0; x < width; x += 1) {
    if (paper[x]) {
      if (run < 0) run = x;
      if (x - run > bestEnd - bestStart) {
        bestStart = run;
        bestEnd = x;
      }
    } else run = -1;
  }
  const span = bestEnd - bestStart;
  if (span < width * 0.4) return false;
  let marked = 0;
  for (let x = bestStart; x <= bestEnd; x += 1) if (ink[x]) marked += 1;
  return marked > span * 0.22;
}

function tryLockBottle(frame: Frame): VisionHit | null {
  const { data, width, height } = frame;
  const rowCount = new Uint16Array(height);
  const rowMin = new Int16Array(height);
  const rowMax = new Int16Array(height);
  rowMin.fill(width);
  rowMax.fill(-1);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      if (!isLooseRed(data[index], data[index + 1], data[index + 2])) continue;
      rowCount[y] += 1;
      if (x < rowMin[y]) rowMin[y] = x;
      if (x > rowMax[y]) rowMax[y] = x;
    }
  }

  let top = -1;
  for (let y = 1; y < height - 1; y += 1) {
    if (rowCount[y] >= 3 && rowMax[y] - rowMin[y] < width * 0.34) {
      top = y;
      break;
    }
  }
  if (top < 0) return null;

  let bottom = top;
  let minX = rowMin[top];
  let maxX = rowMax[top];
  let count = 0;
  let gap = 0;
  for (let y = top; y < height - 1; y += 1) {
    if (rowCount[y] < 2) {
      gap += 1;
      if (gap > 3) break;
      continue;
    }
    const overlaps = rowMax[y] >= minX - 8 && rowMin[y] <= maxX + 8;
    if (!overlaps && y > top + 2) break;
    gap = 0;
    bottom = y;
    if (rowMin[y] < minX) minX = rowMin[y];
    if (rowMax[y] > maxX) maxX = rowMax[y];
    count += rowCount[y];
    if (bottom - top > height * 0.16) break;
  }

  const capW = maxX - minX;
  const capH = Math.max(1, bottom - top);
  if (count < 8 || capW < 4 || capH < 2) return null;
  if (capW > width * 0.34 || count < capW * capH * 0.12) return null;

  const border = borderColor(data, width, height);
  let beside = 0;
  let besideSeen = 0;
  const left = Math.max(0, minX - Math.max(4, capW));
  const right = Math.min(width - 1, maxX + Math.max(4, capW));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (x >= minX && x <= maxX) continue;
      const index = (y * width + x) * 4;
      besideSeen += 1;
      if (!isLooseRed(data[index], data[index + 1], data[index + 2]) && distance(data[index], data[index + 1], data[index + 2], border) > 34) beside += 1;
    }
  }
  if (besideSeen > 0 && beside / besideSeen > 0.42) return null;

  const center = (minX + maxX) / 2;
  const half = Math.max(capW * 1.7, width * 0.085);
  const x0 = Math.max(0, Math.round(center - half));
  const x1 = Math.min(width - 1, Math.round(center + half));
  const y0 = Math.max(0, top - 2);
  const y1 = Math.min(height - 1, bottom + Math.round(height * 0.68));

  let pale = 0;
  let reds = 0;
  let blues = 0;
  let greens = 0;
  let yellows = 0;
  let seen = 0;
  for (let y = bottom + 2; y < y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const sat = max === 0 ? 0 : (max - min) / max;
      seen += 1;
      if (max / 255 > 0.5 && sat < 0.28) pale += 1;
      if (sat > 0.32 && max / 255 > 0.25) {
        if (red > green && red > blue) reds += 1;
        else if (blue > red && blue > green) blues += 1;
        else if (green > red && green > blue) greens += 1;
        else yellows += 1;
      }
    }
  }
  const families = [reds, blues, greens, yellows].filter((amount) => seen > 0 && amount / seen > 0.05).length;
  if (!seen || pale / seen < 0.42 || families >= 2) return null;
  if (capW < width * 0.1 && (x1 - x0) / Math.max(1, y1 - y0) > 1.05) return null;
  if (capW < width * 0.075 && printedSheetBehind(data, width, height)) return null;

  const material = materialByCode("PET");
  return {
    material,
    confidence: 0.94,
    bbox: {
      x: x0 / width,
      y: y0 / height,
      w: (x1 - x0) / width,
      h: (y1 - y0) / height,
    },
    inferenceMs: 0,
    objectName: "Botella plástica PET",
    scores: [
      { code: "PET", score: 1.2 },
      { code: "HDPE", score: 0.2 },
      { code: "MLT", score: 0.08 },
      { code: "PAP", score: 0.04 },
      { code: "VID", score: 0.04 },
      { code: "MET", score: 0.03 },
      { code: "ORG", score: 0.02 },
      { code: "GEN", score: 0.02 },
    ],
    segmented: true,
  };
}

function isCapPixel(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const sat = max === 0 ? 0 : (max - min) / max;
  const value = max / 255;
  return value > 0.34 && sat > 0.4 && red > 100 && red > green + 28 && red > blue + 28;
}

function isDarkCloth(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const sat = max === 0 ? 0 : (max - min) / max;
  return max / 255 < 0.3 && sat < 0.28;
}

function isSkin(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const sat = max === 0 ? 0 : (max - min) / max;
  const value = max / 255;
  return red > 90 && red > green && green >= blue - 8 && red - blue < 70 && sat > 0.14 && sat < 0.4 && value > 0.3 && value < 0.92;
}

function isPackagingPixel(red: number, green: number, blue: number, border: [number, number, number]) {
  if (isDarkCloth(red, green, blue) || isSkin(red, green, blue)) return false;
  return distance(red, green, blue, border) > 30;
}

function capSitsOnLabel(
  data: Uint8ClampedArray,
  width: number,
  border: [number, number, number],
  capMinX: number,
  capMinY: number,
  capMaxX: number,
  capMaxY: number,
) {
  const capW = Math.max(1, capMaxX - capMinX);
  const left = Math.max(0, capMinX - capW);
  const right = Math.min(width - 1, capMaxX + capW);
  let beside = 0;
  let seen = 0;
  for (let y = capMinY; y <= capMaxY; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (x >= capMinX && x <= capMaxX) continue;
      const index = (y * width + x) * 4;
      seen += 1;
      if (isPackagingPixel(data[index], data[index + 1], data[index + 2], border)) beside += 1;
    }
  }
  return seen > 0 && beside / seen > 0.5;
}

function densestSpan(columns: Uint16Array, minW: number, maxW: number) {
  const prefix = new Uint32Array(columns.length + 1);
  for (let index = 0; index < columns.length; index += 1) prefix[index + 1] = prefix[index] + columns[index];
  let best: { x0: number; x1: number; sum: number } | null = null;
  let bestScore = 0;
  const limit = Math.min(maxW, columns.length - 1);
  for (let span = minW; span <= limit; span += 2) {
    for (let x0 = 0; x0 + span < columns.length; x0 += 2) {
      const sum = prefix[x0 + span] - prefix[x0];
      const score = (sum * sum) / span;
      if (score > bestScore) {
        bestScore = score;
        best = { x0, x1: x0 + span, sum };
      }
    }
  }
  return best;
}

function borderColor(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  const allR: number[] = [];
  const allG: number[] = [];
  const allB: number[] = [];
  const lightR: number[] = [];
  const lightG: number[] = [];
  const lightB: number[] = [];
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (x > 8 && y > 8 && x < width - 9 && y < height - 9) continue;
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      allR.push(red);
      allG.push(green);
      allB.push(blue);
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat < 0.2 && max / 255 > 0.45) {
        lightR.push(red);
        lightG.push(green);
        lightB.push(blue);
      }
    }
  }
  if (lightR.length > 24) return [median(lightR), median(lightG), median(lightB)];
  return [median(allR), median(allG), median(allB)];
}

function buildSample(kind: SampleKind): Frame {
  const width = 160;
  const height = 128;
  const data = new Uint8ClampedArray(width * height * 4);
  const rand = mulberry32(kind.length * 97 + kind.charCodeAt(0));
  fill(data, width, 0, 0, width, height, [214, 208, 198], rand, 8);
  if (kind === "PET") {
    fill(data, width, 62, 22, 40, 94, [186, 214, 228], rand, 22);
    fill(data, width, 68, 12, 28, 14, [176, 32, 42], rand, 8);
  }
  if (kind === "HDPE") fill(data, width, 38, 28, 86, 78, [244, 244, 240], rand, 6);
  if (kind === "MLT") {
    fill(data, width, 34, 24, 92, 82, [246, 246, 242], rand, 4);
    fill(data, width, 42, 34, 28, 22, [214, 54, 68], rand, 4);
    fill(data, width, 78, 34, 34, 18, [36, 110, 196], rand, 4);
    fill(data, width, 48, 68, 60, 22, [242, 184, 48], rand, 4);
  }
  if (kind === "PAP") fill(data, width, 30, 22, 100, 84, [156, 108, 62], rand, 14);
  if (kind === "VID") fill(data, width, 64, 14, 34, 100, [58, 156, 86], rand, 8);
  if (kind === "MET") {
    fill(data, width, 58, 18, 46, 96, [168, 172, 176], rand, 8);
    fill(data, width, 58, 30, 46, 8, [236, 238, 240], rand, 2);
    fill(data, width, 58, 70, 46, 10, [92, 96, 100], rand, 2);
  }
  if (kind === "ORG") fill(data, width, 46, 36, 70, 58, [232, 176, 42], rand, 16);
  if (kind === "GEN") {
    for (let y = 18; y < 110; y += 8) {
      for (let x = 28; x < 132; x += 8) {
        const hue = Math.floor(rand() * 5);
        const colors: [number, number, number][] = [
          [220, 40, 70],
          [40, 80, 210],
          [240, 210, 30],
          [20, 20, 20],
          [80, 200, 120],
        ];
        fill(data, width, x, y, 8, 8, colors[hue], rand, 30);
      }
    }
  }
  return { data, width, height };
}

function fill(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: [number, number, number],
  rand: () => number,
  noise: number,
) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      const index = (row * width + col) * 4;
      data[index] = clampByte(color[0] + (rand() - 0.5) * noise);
      data[index + 1] = clampByte(color[1] + (rand() - 0.5) * noise);
      data[index + 2] = clampByte(color[2] + (rand() - 0.5) * noise);
      data[index + 3] = 255;
    }
  }
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

function distance(red: number, green: number, blue: number, border: [number, number, number]) {
  return Math.hypot(red - border[0], green - border[1], blue - border[2]);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function boxJump(a: BBox, b: BBox) {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  return Math.hypot(ax - bx, ay - by);
}

function boxOverlap(a: BBox, b: BBox) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const union = a.w * a.h + b.w * b.h - x * y;
  return union <= 0 ? 0 : (x * y) / union;
}

function mixBox(from: BBox, to: BBox, amount: number): BBox {
  const keep = 1 - amount;
  return {
    x: from.x * keep + to.x * amount,
    y: from.y * keep + to.y * amount,
    w: from.w * keep + to.w * amount,
    h: from.h * keep + to.h * amount,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
