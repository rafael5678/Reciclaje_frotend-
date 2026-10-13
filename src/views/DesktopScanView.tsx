import { ScannerView } from "./ScannerView";

export function DesktopScanView() {
  return (
    <div className="desk-scan">
      <div className="desk-scan-frame">
        <ScannerView variant="desk" />
      </div>
    </div>
  );
}
