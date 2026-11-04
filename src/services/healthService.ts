/** Maps /api/health into UI state. */
import type { ServerHealth } from "../models/types";
import { healthRepository } from "../repositories/healthRepository";

export const CHECKING: ServerHealth = {
  state: "checking",
  database: false,
  gemini: false,
  models: [],
  perMinute: 0,
  usedLastMinute: 0,
};

class HealthService {
  async get(): Promise<ServerHealth> {
    try {
      const raw = await healthRepository.get();
      if (raw.service && raw.service !== "ecoscan") {
        return { ...CHECKING, state: "offline", error: "Sin conexión con el servidor" };
      }
      return {
        state: "online",
        database: raw.database,
        gemini: raw.gemini,
        models: (raw.vision?.models ?? []).map((model) => ({ name: model.name, available: model.available, retryAt: model.retry_at })),
        perMinute: raw.vision?.per_minute ?? 0,
        usedLastMinute: raw.vision?.used_last_minute ?? 0,
      };
    } catch (error) {
      return { ...CHECKING, state: "offline", error: error instanceof Error ? error.message : "Sin conexión con el servidor" };
    }
  }
}

export const healthService = new HealthService();
