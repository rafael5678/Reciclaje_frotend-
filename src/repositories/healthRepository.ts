/** GET /api/health. */
import { api } from "./http";

export type ApiHealth = {
  service?: string;
  database: boolean;
  gemini: boolean;
  anthropic?: boolean;
  vision?: {
    models: { name: string; available: boolean; retry_at: number | null }[];
    per_minute: number;
    used_last_minute: number;
    anthropic?: { enabled?: boolean; model?: string | null; available?: boolean; retry_at?: number | null };
  };
};

export const healthRepository = {
  get() {
    return api<ApiHealth>("/api/health", {}, null, { retries: [] });
  },
};
