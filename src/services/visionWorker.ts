/** Talks to the vision Web Worker. Falls back to the main thread if it cannot start. */
import type { VisionHit } from "../models/types";
import { detectFrame, type Frame } from "./visionService";

type DetectOk = { type: "detect"; id: number; hit: VisionHit | null };
type CompactOk = { type: "compact"; id: number; buffer: ArrayBuffer };
type Fail = { type: "error"; id: number; message: string };
type WorkerOut = DetectOk | CompactOk | Fail;

type Pending = {
  resolve: (value: DetectOk | CompactOk) => void;
  reject: (error: Error) => void;
};

class VisionWorkerClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  constructor() {
    if (typeof Worker === "undefined") return;
    try {
      this.worker = new Worker(new URL("../workers/vision.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (event: MessageEvent<WorkerOut>) => this.settle(event.data);
      this.worker.onerror = () => this.disable();
    } catch {
      this.worker = null;
    }
  }

  active(): boolean {
    return this.worker !== null;
  }

  async detect(frame: Frame): Promise<VisionHit | null> {
    if (!this.worker) return detectFrame(frame);
    const copy = frame.data.slice().buffer;
    const id = this.nextId += 1;
    try {
      const reply = await this.send({ type: "detect", id, width: frame.width, height: frame.height, buffer: copy }, [copy]);
      if (reply.type !== "detect") return detectFrame(frame);
      return reply.hit;
    } catch {
      return detectFrame(frame);
    }
  }

  async compact(file: File, maxSide: number, quality: number): Promise<File | null> {
    if (!this.worker) return null;
    try {
      const source = await file.arrayBuffer();
      const id = this.nextId += 1;
      const reply = await this.send({ type: "compact", id, buffer: source, maxSide, quality }, [source]);
      if (reply.type !== "compact") return null;
      return new File([reply.buffer], "foto.jpg", { type: "image/jpeg" });
    } catch {
      return null;
    }
  }

  private send(payload: object, transfer: Transferable[]): Promise<DetectOk | CompactOk> {
    const worker = this.worker;
    if (!worker) return Promise.reject(new Error("No worker"));
    const id = (payload as { id: number }).id;
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("Worker timeout"));
      }, 20_000);
      this.pending.set(id, {
        resolve: (value) => {
          window.clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          window.clearTimeout(timer);
          reject(error);
        },
      });
      worker.postMessage(payload, transfer);
    });
  }

  private settle(message: WorkerOut) {
    const job = this.pending.get(message.id);
    if (!job) return;
    this.pending.delete(message.id);
    if (message.type === "error") job.reject(new Error(message.message));
    else job.resolve(message);
  }

  private disable() {
    this.worker?.terminate();
    this.worker = null;
    this.pending.forEach((job) => job.reject(new Error("Worker crashed")));
    this.pending.clear();
  }
}

export const visionWorker = new VisionWorkerClient();
