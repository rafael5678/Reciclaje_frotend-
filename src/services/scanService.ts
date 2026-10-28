import type { Scan, VisionHit } from "../models/types";
import { scanRepository, type ScanDraft } from "../repositories/scanRepository";

export const scanService = {
  list(): Promise<Scan[]> {
    return scanRepository.list();
  },
  analyzePhoto(file: File): Promise<VisionHit> {
    return scanRepository.analyzePhoto(file);
  },
  register(draft: ScanDraft, file?: File | null): Promise<Scan> {
    return scanRepository.create(draft, file);
  },
};
