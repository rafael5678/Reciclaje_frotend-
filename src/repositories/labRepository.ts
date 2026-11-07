/** POST /api/lab/throw */
import type { LabThrowResult } from "../models/lab";
import { ApiError, api } from "./http";
import { sessionRepository } from "./sessionRepository";

const MISSING_KEY = "ecoscan.labThrowMissing";

type Raw = {
  correct: boolean;
  delta: number;
  points: number;
  lab_penalty: number;
  hint: string;
  piece_title: string;
  bin_title: string;
  expected_bin: string;
};

class LabRepository {
  async throw(pieceId: string, binId: string): Promise<LabThrowResult> {
    if (sessionStorage.getItem(MISSING_KEY)) {
      throw new ApiError(404, "El laboratorio en el servidor aún no está listo");
    }
    let raw: Raw;
    try {
      raw = await api<Raw>(
        "/api/lab/throw",
        { method: "POST", body: JSON.stringify({ piece_id: pieceId, bin_id: binId }) },
        sessionRepository.token(),
      );
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
        sessionStorage.setItem(MISSING_KEY, "1");
      }
      throw error;
    }
    return {
      correct: raw.correct,
      delta: raw.delta,
      points: raw.points,
      labPenalty: raw.lab_penalty,
      hint: raw.hint,
      pieceTitle: raw.piece_title,
      binTitle: raw.bin_title,
      expectedBin: raw.expected_bin,
    };
  }
}

export const labRepository = new LabRepository();
