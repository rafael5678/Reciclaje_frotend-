import { api } from "./http";
import { mapScan } from "./scanRepository";
import { sessionRepository } from "./sessionRepository";

export type ApiImpact = {
  total: number;
  well_percent: number;
  today: number;
  last7: number;
  previous7: number;
  night: number;
  week_change_percent: number;
  points: number;
  weight_kg: number;
  co2_kg: number;
  weekly: { label: string; count: number; is_today: boolean }[];
  categories: { name: string; count: number; percent: number; color: string }[];
  recent: Parameters<typeof mapScan>[0][];
};

export const impactRepository = {
  get() {
    return api<ApiImpact>("/api/impact", {}, sessionRepository.token());
  },
};
