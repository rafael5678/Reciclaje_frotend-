import { useEffect, useState } from "react";
import type { Scan } from "../models/types";
import { scanRepository } from "../repositories/scanRepository";
import { WasteArt } from "./WasteArt";

export function ScanPhoto({ scan, compact = false }: { scan: Scan; compact?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!scan.hasPhoto) return;
    let alive = true;
    let url = "";
    scanRepository.photo(scan.id).then((next) => {
      if (!alive || !next) return;
      url = next;
      setSrc(next);
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [scan.id, scan.hasPhoto]);

  return (
    <div className={compact ? "scan-photo compact" : "scan-photo"}>
      {src ? <img className="scan-thumb" src={src} alt={scan.objectName} /> : <WasteArt code={scan.materialCode} />}
    </div>
  );
}
