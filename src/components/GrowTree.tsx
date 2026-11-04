/** Arbol que crece segun los puntos del ranking. */
import { groveFrom, type TreeKind } from "../services/forest";

export function GrowTree({
  points,
  category,
  kind,
  stage,
  compact = false,
}: {
  points?: number;
  category?: string;
  kind?: TreeKind;
  stage?: number;
  compact?: boolean;
}) {
  const grove = kind != null && stage != null ? { kind, stage, label: groveFrom(points ?? 0).label, title: groveFrom(points ?? 0, category).title } : groveFrom(points ?? 0, category);
  const treeKind = kind ?? grove.kind;
  const treeStage = stage ?? grove.stage;
  return (
    <div className={`grow-tree is-${treeKind} stage-${treeStage}${compact ? " is-compact" : ""}`} title={`${grove.title} · ${grove.label}`}>
      <div className="tree-sky" aria-hidden="true">
        {treeKind === "palmera" ? <Palm stage={treeStage} /> : <Broadleaf stage={treeStage} kind={treeKind} />}
      </div>
      {!compact ? (
        <p>
          <strong>{grove.title}</strong>
          <span>{grove.label}{points != null ? ` · ${points} pts` : ""}</span>
        </p>
      ) : (
        <small>{grove.title}</small>
      )}
    </div>
  );
}

function Palm({ stage }: { stage: number }) {
  const height = 18 + stage * 10;
  return (
    <svg viewBox="0 0 80 90" className="tree-svg">
      <ellipse cx="40" cy="84" rx="22" ry="4" fill="#0b241c" opacity="0.35" />
      <rect x="37" y={84 - height} width="6" height={height} rx="3" fill="#8b5a2b" />
      {stage >= 1 ? <path d="M40 28 C18 34 14 18 22 12" stroke="#1de28d" strokeWidth="5" fill="none" strokeLinecap="round" /> : null}
      {stage >= 2 ? <path d="M40 28 C62 34 66 18 58 12" stroke="#19c56a" strokeWidth="5" fill="none" strokeLinecap="round" /> : null}
      {stage >= 3 ? <path d="M40 26 C24 8 40 4 40 18" stroke="#2fe39a" strokeWidth="5" fill="none" strokeLinecap="round" /> : null}
      {stage >= 4 ? <circle cx="40" cy="22" r="5" fill="#ffd166" /> : null}
    </svg>
  );
}

function Broadleaf({ stage, kind }: { stage: number; kind: TreeKind }) {
  const color = kind === "frutal" ? "#e85d4c" : kind === "pino" ? "#0f7a4a" : kind === "ceiba" ? "#1de28d" : "#2a9d5c";
  const size = 10 + stage * 6;
  return (
    <svg viewBox="0 0 80 90" className="tree-svg">
      <ellipse cx="40" cy="84" rx="22" ry="4" fill="#0b241c" opacity="0.35" />
      <rect x="37" y="48" width="6" height="36" rx="3" fill="#6b4226" />
      {stage === 0 ? <circle cx="40" cy="72" r="6" fill="#8fe08a" /> : <circle cx="40" cy={58 - stage} r={size} fill={color} />}
      {stage >= 3 && kind === "frutal" ? (
        <>
          <circle cx="32" cy="50" r="3" fill="#e7c27a" />
          <circle cx="50" cy="54" r="3" fill="#e7c27a" />
        </>
      ) : null}
    </svg>
  );
}
