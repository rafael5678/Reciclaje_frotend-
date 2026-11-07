/** Bins and pieces for the sorting lab. Spanish copy only. */
import type { LabBin, LabPiece, LabSpecimen } from "../models/lab";
import type { Scan } from "../models/types";

export const MISTAKE_COST = 5;

const BINS: LabBin[] = [
  { id: "yellow", title: "Amarillo", detail: "Plásticos y envases", tone: "yellow" },
  { id: "blue", title: "Azul", detail: "Papel y cartón", tone: "blue" },
  { id: "green", title: "Verde", detail: "Vidrio", tone: "green" },
  { id: "black", title: "Negro", detail: "No se recicla", tone: "black" },
  { id: "brown", title: "Marrón", detail: "Orgánicos", tone: "brown" },
];

const PIECES: LabPiece[] = [
  {
    id: "pet-cap",
    title: "Tapa",
    kicker: "PP · N.º 5",
    binId: "yellow",
    prep: "unscrew",
    lockedUntil: [],
    hint: "La tapa es otro plástico. Quítala y tírala al amarillo, no pegada al PET.",
  },
  {
    id: "pet-label",
    title: "Etiqueta",
    kicker: "Papel o film",
    binId: "blue",
    prep: "peel",
    lockedUntil: [],
    hint: "Pélala. Si es papel, va al azul. El adhesivo no es botella.",
  },
  {
    id: "pet-body",
    title: "Cuerpo PET",
    kicker: "PET · N.º 1",
    binId: "yellow",
    prep: "none",
    lockedUntil: ["pet-cap", "pet-label"],
    hint: "Enjuaga, aplasta y deposita el cuerpo en el amarillo.",
  },
  {
    id: "glass-lid",
    title: "Tapa de metal",
    kicker: "Metal",
    binId: "yellow",
    prep: "unscrew",
    lockedUntil: [],
    hint: "El metal de la tapa va con envases, no con el vidrio.",
  },
  {
    id: "glass-body",
    title: "Frasco de vidrio",
    kicker: "Vidrio",
    binId: "green",
    prep: "none",
    lockedUntil: ["glass-lid"],
    hint: "Coge el vidrio por el cuerpo, enjuágalo y tira al verde. No lo rompas.",
  },
  {
    id: "paper-box",
    title: "Cartón",
    kicker: "Papel y cartón",
    binId: "blue",
    prep: "none",
    lockedUntil: [],
    hint: "Cartón limpio y aplastado va al azul.",
  },
  {
    id: "paper-sheet",
    title: "Papel",
    kicker: "Papel",
    binId: "blue",
    prep: "none",
    lockedUntil: [],
    hint: "Papel seco y sin grasa va al azul.",
  },
  {
    id: "peel",
    title: "Cáscara",
    kicker: "Orgánico",
    binId: "brown",
    prep: "none",
    lockedUntil: [],
    hint: "Restos de comida van al marrón, sin bolsa plástica.",
  },
  {
    id: "napkin",
    title: "Servilleta sucia",
    kicker: "No reciclable",
    binId: "black",
    prep: "none",
    lockedUntil: [],
    hint: "Papel sucio no se recicla. Va al negro.",
  },
  {
    id: "hdpe-cap",
    title: "Tapa HDPE",
    kicker: "HDPE",
    binId: "yellow",
    prep: "unscrew",
    lockedUntil: [],
    hint: "La tapa va al amarillo, suelta del envase.",
  },
  {
    id: "hdpe-body",
    title: "Envase HDPE",
    kicker: "HDPE",
    binId: "yellow",
    prep: "none",
    lockedUntil: ["hdpe-cap"],
    hint: "El envase opaco va al amarillo, enjuagado.",
  },
  {
    id: "mlt-pack",
    title: "Caja multicapa",
    kicker: "Tetra",
    binId: "yellow",
    prep: "none",
    lockedUntil: [],
    hint: "Parece cartón, pero va al amarillo, no al azul.",
  },
  {
    id: "met-can",
    title: "Lata",
    kicker: "Metal",
    binId: "yellow",
    prep: "none",
    lockedUntil: [],
    hint: "Latas limpias van al amarillo, con los envases.",
  },
];

const SPECIMENS: LabSpecimen[] = [
  { id: "pet", title: "Botella PET", blurb: "Gira la tapa, pela la etiqueta y tira cada pieza.", kind: "bottle", pieceIds: ["pet-cap", "pet-label", "pet-body"], materialCode: "PET", container: "Amarillo" },
  { id: "hdpe", title: "Envase HDPE", blurb: "Quita la tapa. El envase opaco va al amarillo.", kind: "jug", pieceIds: ["hdpe-cap", "hdpe-body"], materialCode: "HDPE", container: "Amarillo" },
  { id: "glass", title: "Frasco de vidrio", blurb: "Quita el metal. El vidrio se coge por el cuerpo.", kind: "glass", pieceIds: ["glass-lid", "glass-body"], materialCode: "VID", container: "Verde" },
  { id: "tetra", title: "Caja de leche", blurb: "No es cartón común: va al amarillo.", kind: "carton", pieceIds: ["mlt-pack"], materialCode: "MLT", container: "Amarillo" },
  { id: "can", title: "Lata", blurb: "Enjuaga y tira con los envases.", kind: "can", pieceIds: ["met-can"], materialCode: "MET", container: "Amarillo" },
  { id: "box", title: "Caja de cartón", blurb: "Aplástala. No va con las cajas de leche.", kind: "box", pieceIds: ["paper-box"], materialCode: "PAP", container: "Azul" },
  { id: "paper", title: "Hoja de papel", blurb: "Solo si está seca y limpia.", kind: "paper", pieceIds: ["paper-sheet"], materialCode: "PAP", container: "Azul" },
  { id: "food", title: "Cáscara", blurb: "Orgánico, sin empaque.", kind: "peel", pieceIds: ["peel"], materialCode: "ORG", container: "Marrón" },
  { id: "trash", title: "Servilleta sucia", blurb: "Contamina el papel limpio.", kind: "napkin", pieceIds: ["napkin"], materialCode: "GEN", container: "Negro" },
];

const CODE_TO_ID: Record<string, string> = {
  PET: "pet",
  HDPE: "hdpe",
  VID: "glass",
  MLT: "tetra",
  MET: "can",
  PAP: "box",
  ORG: "food",
  GEN: "trash",
};

class LabCatalog {
  bins(): LabBin[] {
    return BINS;
  }

  specimens(): LabSpecimen[] {
    return SPECIMENS;
  }

  piece(id: string): LabPiece | undefined {
    return PIECES.find((item) => item.id === id);
  }

  bin(id: string): LabBin | undefined {
    return BINS.find((item) => item.id === id);
  }

  piecesFor(specimen: LabSpecimen): LabPiece[] {
    return specimen.pieceIds.map((id) => this.piece(id)).filter((item): item is LabPiece => Boolean(item));
  }

  templateFor(materialCode: string): LabSpecimen {
    const id = CODE_TO_ID[materialCode] ?? "trash";
    return SPECIMENS.find((item) => item.id === id) ?? SPECIMENS[0];
  }

  fromScan(scan: Scan): LabSpecimen {
    const template = this.templateFor(scan.materialCode);
    return {
      ...template,
      id: `scan-${scan.id}`,
      title: scan.objectName,
      blurb: `La IA lo clasificó como ${scan.materialName}. Hay que dividirlo y tirar cada parte.`,
      materialCode: scan.materialCode,
      fromScan: true,
      container: scan.container,
      steps: scan.steps,
      confidence: scan.confidence,
    };
  }

  practiceQueue(scans: Scan[]): LabSpecimen[] {
    const seen = new Set<string>();
    const fromHistory: LabSpecimen[] = [];
    for (const scan of scans) {
      if (seen.has(scan.materialCode)) continue;
      seen.add(scan.materialCode);
      fromHistory.push(this.fromScan(scan));
    }
    const extra = SPECIMENS.filter((item) => !seen.has(item.materialCode));
    return [...fromHistory, ...extra];
  }
}

export const labCatalog = new LabCatalog();
