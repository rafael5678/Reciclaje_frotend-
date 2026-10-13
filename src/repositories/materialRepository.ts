import { MATERIALS } from "../models/catalog";
import type { Material } from "../models/types";
import { api } from "./http";

type ApiMaterial = {
  code: string;
  name: string;
  full_name: string;
  category: string;
  object_name: string;
  container: string;
  container_detail: string;
  steps: string[];
  primary_action: string;
  recyclable: boolean;
  weight_kg: number;
  co2_kg: number;
  accent: string;
  tone: string;
  warning: string;
  blurb: string;
};

export function mapMaterial(raw: ApiMaterial): Material {
  return {
    code: raw.code,
    name: raw.name,
    fullName: raw.full_name,
    category: raw.category,
    objectName: raw.object_name,
    container: raw.container,
    containerDetail: raw.container_detail,
    steps: raw.steps,
    primaryAction: raw.primary_action,
    recyclable: raw.recyclable,
    weightKg: raw.weight_kg,
    co2Kg: raw.co2_kg,
    accent: raw.accent,
    tone: raw.tone,
    warning: raw.warning,
    blurb: raw.blurb,
  };
}

export const materialRepository = {
  async list(): Promise<Material[]> {
    try {
      const rows = await api<ApiMaterial[]>("/api/materials");
      return rows.map(mapMaterial);
    } catch {
      return MATERIALS;
    }
  },
};
