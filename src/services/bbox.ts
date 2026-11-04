/** Bounding-box helpers to fuse detections. */
import type { BBox } from "../models/types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function boxJump(a: BBox, b: BBox) {
  return Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.y + a.h / 2 - (b.y + b.h / 2));
}

export function mixBox(from: BBox, to: BBox, amount: number): BBox {
  const keep = 1 - amount;
  return {
    x: from.x * keep + to.x * amount,
    y: from.y * keep + to.y * amount,
    w: from.w * keep + to.w * amount,
    h: from.h * keep + to.h * amount,
  };
}
