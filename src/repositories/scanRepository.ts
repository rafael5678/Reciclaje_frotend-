import { materialByCode } from "../models/catalog";
import type { Scan, VisionHit } from "../models/types";
import { api, apiUpload, apiUrl } from "./http";
import { sessionRepository } from "./sessionRepository";

export type ScanDraft = {
  materialCode: string;
  objectName: string;
  confidence: number;
  separatedWell: boolean;
};

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
  has_photo?: boolean;
};

export function mapScan(raw: ApiScan): Scan {
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
    hasPhoto: Boolean(raw.has_photo),
  };
}

type AnalyzeRaw = {
  material_code: string;
  object_name: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  inference_ms: number;
  engine: string;
  model?: string | null;
  scores: { code: string; score: number }[];
  guide?: { meaning: string; destination: string; actions: string[]; tip: string };
};

export const scanRepository = {
  async analyzePhoto(file: File): Promise<VisionHit> {
    const token = sessionRepository.token();
    const raw = await apiUpload<AnalyzeRaw>("/api/analyze", file, token);
    return {
      material: materialByCode(raw.material_code),
      confidence: raw.confidence,
      bbox: raw.bbox,
      inferenceMs: raw.inference_ms,
      objectName: raw.object_name,
      scores: raw.scores,
      segmented: true,
      engine: raw.engine,
      model: raw.model ?? undefined,
      guide: raw.guide,
    };
  },
  async list(): Promise<Scan[]> {
    const token = sessionRepository.token();
    const rows = await api<ApiScan[]>("/api/scans", {}, token);
    return rows.map((row) => mapScan(row));
  },
  async create(draft: ScanDraft, file?: File | null): Promise<Scan> {
    const token = sessionRepository.token();
    if (file) {
      try {
        return mapScan(await apiUpload<ApiScan>("/api/scans", file, token, toFields(draft), "No se pudo guardar el escaneo"));
      } catch (first) {
        try {
          return mapScan(await api<ApiScan>("/api/scans", { method: "POST", body: JSON.stringify(toBody(draft)) }, token));
        } catch {
          throw first;
        }
      }
    }
    return mapScan(await api<ApiScan>("/api/scans", { method: "POST", body: JSON.stringify(toBody(draft)) }, token));
  },
  async photo(id: number): Promise<string | null> {
    const token = sessionRepository.token();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    try {
      const response = await fetch(apiUrl(`/api/scans/${id}/photo`), { headers });
      if (!response.ok) return null;
      return URL.createObjectURL(await response.blob());
    } catch {
      return null;
    }
  },
};

function toFields(draft: ScanDraft): Record<string, string> {
  return {
    material_code: draft.materialCode,
    object_name: draft.objectName,
    confidence: String(draft.confidence),
    separated_well: draft.separatedWell ? "true" : "false",
  };
}

function toBody(draft: ScanDraft) {
  return {
    material_code: draft.materialCode,
    object_name: draft.objectName,
    confidence: draft.confidence,
    separated_well: draft.separatedWell,
  };
}
