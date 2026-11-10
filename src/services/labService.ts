/** Grade a throw. Uses the API when it is up; never invents scan history. */
import type { LabThrowResult } from "../models/lab";
import { labRepository } from "../repositories/labRepository";
import { sessionRepository } from "../repositories/sessionRepository";
import { labCatalog, MISTAKE_COST } from "./labCatalog";

class LocalLedger {
  total(userKey: string): number {
    const raw = localStorage.getItem(this.key(userKey));
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  }

  add(userKey: string, delta: number): number {
    const next = this.total(userKey) + delta;
    localStorage.setItem(this.key(userKey), String(next));
    return next;
  }

  private key(userKey: string) {
    return `ecoscan.labPenalty.${userKey}`;
  }
}

class LabService {
  private ledger = new LocalLedger();

  preview(pieceId: string, binId: string, scanPoints: number): LabThrowResult | null {
    return this.grade(pieceId, binId, scanPoints, false);
  }

  gradeLocal(pieceId: string, binId: string, scanPoints: number): LabThrowResult | null {
    return this.grade(pieceId, binId, scanPoints, true);
  }

  private grade(pieceId: string, binId: string, scanPoints: number, persist: boolean): LabThrowResult | null {
    const piece = labCatalog.piece(pieceId);
    const bin = labCatalog.bin(binId);
    if (!piece || !bin) return null;
    const expected = labCatalog.bin(piece.binId);
    const correct = piece.binId === binId;
    const delta = correct ? 0 : -MISTAKE_COST;
    const userKey = sessionRepository.token() || "guest";
    const labPenalty = persist ? this.ledger.add(userKey, delta) : this.ledger.total(userKey) + delta;
    return {
      correct,
      delta,
      points: Math.max(0, scanPoints + labPenalty),
      labPenalty,
      hint: correct ? piece.hint : `No va al ${bin.title}. ${piece.hint}`,
      pieceTitle: piece.title,
      binTitle: bin.title,
      expectedBin: expected?.title ?? "",
    };
  }

  async throw(pieceId: string, binId: string, scanPoints: number): Promise<LabThrowResult> {
    try {
      return await labRepository.throw(pieceId, binId);
    } catch {
      const local = this.gradeLocal(pieceId, binId, scanPoints);
      if (!local) throw new Error("Esa pieza no está en el laboratorio");
      return local;
    }
  }
}

export const labService = new LabService();
