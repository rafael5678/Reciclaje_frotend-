export type TreeKind = "palmera" | "frutal" | "pino" | "roble" | "ceiba";

export type Grove = {
  kind: TreeKind;
  stage: number;
  label: string;
  title: string;
};

const LABELS = ["Semilla", "Brote", "Árbol joven", "Árbol", "Árbol grande", "Bosque en miniatura"];

export function groveFrom(points: number, topCategory?: string): Grove {
  const kind = kindFrom(topCategory);
  const stage =
    points >= 400 ? 5 : points >= 200 ? 4 : points >= 100 ? 3 : points >= 50 ? 2 : points >= 20 ? 1 : 0;
  const names: Record<TreeKind, string> = {
    palmera: "Palmera",
    frutal: "Árbol frutal",
    pino: "Pino",
    roble: "Roble",
    ceiba: "Ceiba",
  };
  return { kind, stage, label: LABELS[stage], title: names[kind] };
}

function kindFrom(category?: string): TreeKind {
  const value = (category || "").toLowerCase();
  if (value.includes("plást") || value === "pet" || value === "hdpe" || value === "mlt") return "palmera";
  if (value.includes("orgán") || value === "org") return "frutal";
  if (value.includes("papel") || value === "pap") return "pino";
  if (value.includes("vidrio") || value.includes("metal") || value === "vid" || value === "met") return "roble";
  return "ceiba";
}
