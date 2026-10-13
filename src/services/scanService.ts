import type { Scan, VisionHit } from "../models/types";
import { scanRepository, type ScanDraft } from "../repositories/scanRepository";

export const scanService = {
  list(): Promise<Scan[]> {
    return scanRepository.list();
  },
  analyzePhoto(file: File): Promise<VisionHit> {
    return scanRepository.analyzePhoto(file);
  },
  register(draft: ScanDraft): Promise<Scan> {
    return scanRepository.create(draft);
  },
  flush(): Promise<void> {
    return scanRepository.flush();
  },
  local(): Scan[] {
    return scanRepository.localScans();
  },
};
