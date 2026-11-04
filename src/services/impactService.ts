/** Maps /api/impact into UI state. */
import type { Impact } from "../models/types";
import { impactRepository } from "../repositories/impactRepository";
import { mapScan } from "../repositories/scanRepository";

class ImpactService {
  async get(): Promise<Impact> {
    const raw = await impactRepository.get();
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
  }
}

export const impactService = new ImpactService();
