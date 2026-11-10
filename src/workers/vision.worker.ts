/// <reference lib="webworker" />
/** Dedicated worker: shape detection and JPEG compact. No DOM. */
import { detectFrame } from "../services/visionService";

type Incoming =
  | { type: "detect"; id: number; width: number; height: number; buffer: ArrayBuffer }
  | { type: "compact"; id: number; buffer: ArrayBuffer; maxSide: number; quality: number };

type Outgoing =
  | { type: "detect"; id: number; hit: ReturnType<typeof detectFrame> }
  | { type: "compact"; id: number; buffer: ArrayBuffer }
  | { type: "error"; id: number; message: string };

self.onmessage = (event: MessageEvent<Incoming>) => {
  const message = event.data;
  void handle(message).catch((error: unknown) => {
    const fail: Outgoing = {
      type: "error",
      id: message.id,
      message: error instanceof Error ? error.message : "Worker failed",
    };
    self.postMessage(fail);
  });
};

async function handle(message: Incoming) {
  if (message.type === "detect") {
    const data = new Uint8ClampedArray(message.buffer);
    const hit = detectFrame({ data, width: message.width, height: message.height });
    const out: Outgoing = { type: "detect", id: message.id, hit };
    self.postMessage(out);
    return;
  }
  const buffer = await compactJpeg(message.buffer, message.maxSide, message.quality);
  const out: Outgoing = { type: "compact", id: message.id, buffer };
  self.postMessage(out, [buffer]);
}

async function compactJpeg(source: ArrayBuffer, maxSide: number, quality: number): Promise<ArrayBuffer> {
  const bitmap = await createImageBitmap(new Blob([source]));
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("No OffscreenCanvas");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
  return blob.arrayBuffer();
}
