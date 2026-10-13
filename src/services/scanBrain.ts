import { materialByCode } from "../models/catalog";
import type { BBox, Score, VisionHit } from "../models/types";
import { detectMiraFromCanvas } from "./miraService";
import { classifyTrashnet, type TrashClass, type TrashGuess } from "./trashnetService";
import { detectFrame, rememberVision, type Frame } from "./visionService";

const SHAPE_ONLY = new Set(["Lápiz", "Lapicero", "Celular", "Control remoto", "Botella plástica PET", "Billete", "Papel higiénico"]);

const NAMES: Record<TrashClass, { code: string; name: string }> = {
  cardboard: { code: "PAP", name: "Caja de cartón" },
  paper: { code: "PAP", name: "Hoja de papel" },
  glass: { code: "VID", name: "Frasco de vidrio" },
  metal: { code: "MET", name: "Lata de metal" },
  plastic: { code: "PET", name: "Botella plástica" },
  trash: { code: "GEN", name: "Residuo general" },
};

export class ScanBrain {
  last: VisionHit | null = null;
  lastBox: BBox | null = null;
  lastMs = 0;
  private miraAge = 99;
  private misses = 0;

  async analyze(frame: Frame, canvas: HTMLCanvasElement, miraReady: boolean): Promise<VisionHit | null> {
    const started = performance.now();
    const cheap = detectFrame(frame);
    if (cheap && SHAPE_ONLY.has(cheap.objectName)) return this.keep(cheap, performance.now() - started);
    if (cheap?.objectName === "Hoja de papel" && cheap.bbox.w < 0.82 && cheap.bbox.h < 0.82) {
      return this.keep(cheap, performance.now() - started);
    }

    let mira: VisionHit | null = null;
    if (miraReady && (this.miraAge >= 3 || !this.lastBox)) {
      mira = await detectMiraFromCanvas(canvas);
      this.miraAge = 0;
      if (mira && looksLikePerson(frame, mira.bbox)) mira = null;
      if (mira) this.lastBox = mira.bbox;
    } else {
      this.miraAge += 1;
    }

    const box = (mira && !looksLikePerson(frame, mira.bbox) ? mira.bbox : null) || this.lastBox || cheap?.bbox || null;
    const person = box ? looksLikePerson(frame, box) : false;
    const trash = !person ? await classifyTrashnet(frame, box ?? undefined) : null;
    const fused = fuse(mira, trash, cheap, box, person, frame);
    return this.keep(fused, performance.now() - started);
  }

  async analyzeStill(frame: Frame, canvas: HTMLCanvasElement, miraReady: boolean): Promise<VisionHit | null> {
    this.last = null;
    this.lastBox = null;
    this.miraAge = 99;
    this.misses = 0;
    const started = performance.now();
    const cheap = detectFrame(frame);
    if (cheap && (SHAPE_ONLY.has(cheap.objectName) || cheap.material.code === "ORG")) {
      return this.stamp(cheap, performance.now() - started);
    }
    const compactSheet = cheap?.objectName === "Hoja de papel" && cheap.bbox.w < 0.82 && cheap.bbox.h < 0.82;
    if (compactSheet && cheap) return this.stamp(cheap, performance.now() - started);

    let mira: VisionHit | null = null;
    if (miraReady) {
      mira = await detectMiraFromCanvas(canvas);
      if (mira && looksLikePerson(frame, mira.bbox)) mira = null;
    }
    const box = mira?.bbox || (cheap && cheap.bbox.w * cheap.bbox.h < 0.5 ? cheap.bbox : null) || { x: 0.12, y: 0.12, w: 0.76, h: 0.76 };
    const person = looksLikePerson(frame, box);
    const trash = !person ? await classifyTrashnet(frame, box) : null;
    const fused = fuse(mira, trash, compactSheet ? cheap : null, box, person, frame);
    return this.stamp(fused, performance.now() - started);
  }

  private stamp(hit: VisionHit | null, ms: number) {
    this.lastMs = ms;
    if (!hit) return null;
    hit.inferenceMs = ms;
    this.last = hit;
    this.lastBox = hit.bbox;
    rememberVision(ms, hit.confidence);
    return hit;
  }

  private keep(hit: VisionHit | null, ms: number) {
    this.lastMs = ms;
    if (!hit) {
      this.misses += 1;
      if (this.misses > 3) {
        this.last = null;
        this.lastBox = null;
      }
      return this.last ? { ...this.last, inferenceMs: ms } : null;
    }
    this.misses = 0;
    hit.inferenceMs = ms;
    if (this.last) {
      const jump = boxJump(this.last.bbox, hit.bbox);
      const follow = jump > 0.08 ? 1 : 0.72;
      const samePlace = jump < 0.14;
      if (samePlace && this.last.material.code !== hit.material.code && hit.confidence + 0.12 < this.last.confidence) {
        this.last = { ...this.last, bbox: mixBox(this.last.bbox, hit.bbox, follow), inferenceMs: ms };
        rememberVision(ms, this.last.confidence);
        return this.last;
      }
      hit.bbox = mixBox(this.last.bbox, hit.bbox, follow);
    }
    this.last = hit;
    this.lastBox = hit.bbox;
    rememberVision(ms, hit.confidence);
    return hit;
  }
}

function fuse(mira: VisionHit | null, trash: TrashGuess | null, cheap: VisionHit | null, box: BBox | null, person: boolean, frame?: Frame): VisionHit | null {
  if (cheap && SHAPE_ONLY.has(cheap.objectName)) return cheap;
  if (cheap?.objectName === "Hoja de papel" && cheap.bbox.w < 0.82 && cheap.bbox.h < 0.82) return cheap;
  const area = box ?? mira?.bbox ?? { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };
  if (frame && looksLikeSodaBottle(frame, area)) {
    return {
      material: materialByCode("PET"),
      confidence: 0.9,
      bbox: mira?.bbox ?? area,
      inferenceMs: 0,
      objectName: "Botella plástica PET",
      scores: scoreList("PET", 0.9),
      segmented: true,
    };
  }
  if (trash && trash.confidence >= 0.38 && box && !person) {
    const mapped = fromTrash(trash, box);
    if (mira) {
      if (sameFamily(mira.material.code, mapped.material.code) || (mira.material.code === "HDPE" && mapped.material.code === "PET")) {
        mapped.confidence = clamp(0.58 + 0.22 * mira.confidence + 0.22 * trash.confidence, 0.66, 0.98);
        mapped.bbox = mira.bbox;
        if (trash.label === "plastic") return refinePlastic(mapped, mira.bbox);
        return mapped;
      }
      if (trash.confidence >= 0.6 && mira.confidence < 0.58) {
        mapped.bbox = mira.bbox;
        return trash.label === "plastic" ? refinePlastic(mapped, mira.bbox) : mapped;
      }
      if (mira.material.code === "PAP") {
        mira.objectName = trash.label === "cardboard" ? "Caja de cartón" : trash.label === "paper" ? "Hoja de papel" : mira.objectName;
      }
      if (mira.material.code === "PET" || mira.material.code === "HDPE") return refinePlastic(mira, mira.bbox);
      if (mira.material.code === "MET" && trash.label === "plastic") return refinePlastic(mapped, mira.bbox);
      return mira;
    }
    return trash.label === "plastic" ? refinePlastic(mapped, box) : mapped;
  }
  if (mira && !person) return mira.material.code === "PET" || mira.material.code === "HDPE" ? refinePlastic(mira, mira.bbox) : mira;
  if (cheap && !person) return cheap;
  return null;
}

function fromTrash(guess: TrashGuess, box: BBox): VisionHit {
  const mapped = NAMES[guess.label];
  const code = mapped.code;
  return {
    material: materialByCode(code),
    confidence: clamp(guess.confidence, 0.4, 0.96),
    bbox: box,
    inferenceMs: 0,
    objectName: mapped.name,
    scores: scoreList(code, guess.confidence),
    segmented: true,
  };
}

function refinePlastic(hit: VisionHit, box: BBox): VisionHit {
  const tall = box.h / Math.max(box.w, 0.01) >= 1.18;
  const code = tall ? "PET" : "HDPE";
  return {
    ...hit,
    material: materialByCode(code),
    objectName: tall ? "Botella plástica" : "Envase de plástico",
    scores: scoreList(code, hit.confidence),
    bbox: box,
  };
}

function sameFamily(a: string, b: string) {
  if (a === b) return true;
  if ((a === "PET" || a === "HDPE") && (b === "PET" || b === "HDPE")) return true;
  return false;
}

function looksLikeSodaBottle(frame: Frame, box: BBox) {
  let pale = 0;
  let redPrint = 0;
  let gray = 0;
  let seen = 0;
  const x0 = Math.max(0, Math.floor(box.x * frame.width));
  const y0 = Math.max(0, Math.floor(box.y * frame.height));
  const x1 = Math.min(frame.width - 1, Math.ceil((box.x + box.w) * frame.width));
  const y1 = Math.min(frame.height - 1, Math.ceil((box.y + box.h) * frame.height));
  for (let y = y0; y <= y1; y += 3) {
    for (let x = x0; x <= x1; x += 3) {
      const index = (y * frame.width + x) * 4;
      const red = frame.data[index];
      const green = frame.data[index + 1];
      const blue = frame.data[index + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const sat = max === 0 ? 0 : (max - min) / max;
      seen += 1;
      if (max / 255 > 0.62 && sat < 0.22) pale += 1;
      const hue = hueOf(red, green, blue);
      if ((hue <= 10 || hue >= 348) && sat > 0.38 && max / 255 > 0.28) redPrint += 1;
      if (sat < 0.12 && max / 255 > 0.28 && max / 255 < 0.68) gray += 1;
    }
  }
  if (!seen) return false;
  const tall = box.h / Math.max(box.w, 0.01) >= 1.12;
  return tall && pale / seen > 0.18 && redPrint / seen > 0.02 && gray / seen < 0.55;
}

function hueOf(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue *= 60;
  return hue < 0 ? hue + 360 : hue;
}

function looksLikePerson(frame: Frame, box: BBox) {
  const area = box.w * box.h;
  if (area < 0.18) return false;
  let skin = 0;
  let dark = 0;
  let pale = 0;
  let seen = 0;
  const x0 = Math.max(0, Math.floor(box.x * frame.width));
  const y0 = Math.max(0, Math.floor(box.y * frame.height));
  const x1 = Math.min(frame.width - 1, Math.ceil((box.x + box.w) * frame.width));
  const y1 = Math.min(frame.height - 1, Math.ceil((box.y + box.h) * frame.height));
  for (let y = y0; y <= y1; y += 4) {
    for (let x = x0; x <= x1; x += 4) {
      const index = (y * frame.width + x) * 4;
      const red = frame.data[index];
      const green = frame.data[index + 1];
      const blue = frame.data[index + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const sat = max === 0 ? 0 : (max - min) / max;
      seen += 1;
      if (max / 255 < 0.32 && sat < 0.3) dark += 1;
      if (max / 255 > 0.72 && sat < 0.16) pale += 1;
      if (red > 90 && red > green && green >= blue - 8 && red - blue < 70 && sat > 0.14 && sat < 0.45 && max / 255 > 0.3) skin += 1;
    }
  }
  if (!seen) return false;
  if (area > 0.5 && dark / seen > 0.42 && pale / seen < 0.16) return true;
  return area > 0.28 && skin / seen > 0.1 && dark / seen > 0.24 && pale / seen < 0.2;
}

function scoreList(code: string, confidence: number): Score[] {
  return ["PET", "HDPE", "MLT", "PAP", "VID", "MET", "ORG", "GEN"].map((item) => ({
    code: item,
    score: item === code ? Math.max(confidence, 0.5) : 0.04,
  }));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function boxJump(a: BBox, b: BBox) {
  return Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.y + a.h / 2 - (b.y + b.h / 2));
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
