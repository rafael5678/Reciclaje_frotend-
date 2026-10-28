import type { Impact } from "../models/types";
import { api } from "../repositories/http";
import { mapScan } from "../repositories/scanRepository";
import { sessionRepository } from "../repositories/sessionRepository";

type ApiImpact = {
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

export const impactService = {
  async get(): Promise<Impact> {
    const raw = await api<ApiImpact>("/api/impact", {}, sessionRepository.token());
    return {
      total: raw.total,
      wellPercent: raw.well_percent,
      today: raw.today,
      last7: raw.last7,
      previous7: raw.previous7,
      night: raw.night,
      weekChangePercent: raw.week_change_percent,
      points: raw.points,
      weightKg: raw.weight_kg,
      co2Kg: raw.co2_kg,
      weekly: raw.weekly.map((day) => ({ label: day.label, count: day.count, isToday: day.is_today })),
      categories: raw.categories,
      recent: raw.recent.map((scan) => mapScan(scan)),
    };
  },
};
