/** Scan thumbnail, or artwork when there is no photo. */
import { useEffect, useState } from "react";
import type { Scan } from "../models/types";
import { scanRepository } from "../repositories/scanRepository";
import { WasteArt } from "./WasteArt";

export function ScanPhoto({
  scan,
  compact = false,
  onOpen,
}: {
  scan: Scan;
  compact?: boolean;
  onOpen?: (src: string) => void;
}) {
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

  const className = `scan-photo${compact ? " compact" : ""}${src && onOpen ? " is-open" : ""}`;
  const body = src ? <img className="scan-thumb" src={src} alt="" /> : <WasteArt code={scan.materialCode} />;
  if (src && onOpen) {
    return (
      <button type="button" className={className} onClick={() => onOpen(src)} aria-label={`Ver foto de ${scan.objectName}`}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
