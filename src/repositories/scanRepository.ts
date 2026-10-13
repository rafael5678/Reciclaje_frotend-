import { materialByCode } from "../models/catalog";
import type { Material, Scan } from "../models/types";
import type { VisionHit } from "../models/types";
import { api, apiUpload } from "./http";
import { sessionRepository } from "./sessionRepository";

const QUEUE = "ecoscan.queue";
const LOCAL = "ecoscan.localScans";

export type ScanDraft = {
  materialCode: string;
  objectName: string;
  confidence: number;
  separatedWell: boolean;
};

type Pending = ScanDraft & { clientId: number };

type ApiScan = {
  id: number;
  material_code: string;
  material_name: string;
  full_name: string;
  category: string;
  object_name: string;
  confidence: number;
  container: string;
  container_detail: string;
  tone: string;
  steps: string[];
  primary_action: string;
  points: number;
  weight_kg: number;
  co2_kg: number;
  created_at: string;
  separated_well: boolean;
  accent: string;
  warning: string;
  recyclable: boolean;
};

export function mapScan(raw: ApiScan, local = false): Scan {
  return {
    id: raw.id,
    materialCode: raw.material_code,
    materialName: raw.material_name,
    fullName: raw.full_name,
    category: raw.category,
    objectName: raw.object_name,
    confidence: raw.confidence,
    container: raw.container,
    containerDetail: raw.container_detail,
    tone: raw.tone,
    steps: raw.steps,
    primaryAction: raw.primary_action,
    points: raw.points,
    weightKg: raw.weight_kg,
    co2Kg: raw.co2_kg,
    createdAt: raw.created_at,
    separatedWell: raw.separated_well,
    accent: raw.accent,
    warning: raw.warning,
    recyclable: raw.recyclable,
    local,
  };
}

function readPending(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) || "[]") as Pending[];
  } catch {
    return [];
  }
}

function readLocal(): Scan[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) || "[]") as Scan[];
  } catch {
    return [];
  }
}

type AnalyzeRaw = {
  material_code: string;
  object_name: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  inference_ms: number;
  engine: string;
  scores: { code: string; score: number }[];
  guide?: { meaning: string; destination: string; actions: string[]; tip: string };
};

export const scanRepository = {
  async analyzePhoto(file: File): Promise<VisionHit> {
    const token = sessionRepository.token();
    const raw = await apiUpload<AnalyzeRaw>("/api/analyze", file, token);
    const material = materialByCode(raw.material_code);
    return {
      material,
      confidence: raw.confidence,
      bbox: raw.bbox,
      inferenceMs: raw.inference_ms,
      objectName: raw.object_name,
      scores: raw.scores,
      segmented: true,
      engine: raw.engine,
      guide: raw.guide,
    };
  },
  async list(): Promise<Scan[]> {
    const token = sessionRepository.token();
    const rows = await api<ApiScan[]>("/api/scans", {}, token);
    return rows.map((row) => mapScan(row));
  },
  async create(draft: ScanDraft): Promise<Scan> {
    const token = sessionRepository.token();
    try {
      const row = await api<ApiScan>(
        "/api/scans",
        { method: "POST", body: JSON.stringify(toBody(draft)) },
        token,
      );
      return mapScan(row);
    } catch (error) {
      if (!isOffline(error)) throw error;
      return this.keepLocal(draft);
    }
  },
  keepLocal(draft: ScanDraft): Scan {
    const material = materialByCode(draft.materialCode);
    const scan = scanFromMaterial(material, draft, -Date.now());
    const pending = readPending();
    pending.push({ ...draft, clientId: scan.id });
    localStorage.setItem(QUEUE, JSON.stringify(pending));
    const local = readLocal();
    local.unshift(scan);
    localStorage.setItem(LOCAL, JSON.stringify(local));
    return scan;
  },
  localScans(): Scan[] {
    return readLocal();
  },
  async flush(): Promise<void> {
    const token = sessionRepository.token();
    if (!token) return;
    const pending = readPending();
    if (!pending.length) return;
    const left: Pending[] = [];
    const synced = new Set<number>();
    for (const item of pending) {
      try {
        await api<ApiScan>("/api/scans", { method: "POST", body: JSON.stringify(toBody(item)) }, token);
        synced.add(item.clientId);
      } catch (error) {
        if (isOffline(error)) left.push(item);
        else synced.add(item.clientId);
      }
    }
    localStorage.setItem(QUEUE, JSON.stringify(left));
    const local = readLocal().filter((scan) => !synced.has(scan.id));
    localStorage.setItem(LOCAL, JSON.stringify(local));
  },
};

function toBody(draft: ScanDraft) {
  return {
    material_code: draft.materialCode,
    object_name: draft.objectName,
    confidence: draft.confidence,
    separated_well: draft.separatedWell,
  };
}

function isOffline(error: unknown): boolean {
  return error instanceof Error && (error.message.includes("Sin conexión") || ("status" in error && (error as { status: number }).status === 0));
}

function scanFromMaterial(material: Material, draft: ScanDraft, id: number): Scan {
  return {
    id,
    materialCode: material.code,
    materialName: material.name,
    fullName: material.fullName,
    category: material.category,
    objectName: draft.objectName,
    confidence: draft.confidence,
    container: material.container,
    containerDetail: material.containerDetail,
    tone: material.tone,
    steps: material.steps,
    primaryAction: material.primaryAction,
    points: 10,
    weightKg: material.weightKg,
    co2Kg: draft.separatedWell ? material.co2Kg : 0,
    createdAt: new Date().toISOString(),
    separatedWell: draft.separatedWell,
    accent: material.accent,
    warning: material.warning,
    recyclable: material.recyclable,
    local: true,
  };
}
