/** Bins and pieces for the sorting lab. Spanish copy only. */
import type { LabBin, LabPiece, LabSpecimen } from "../models/lab";

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
];

const SPECIMENS: LabSpecimen[] = [
  { id: "pet", title: "Botella PET", blurb: "Gira la tapa, pela la etiqueta y tira cada pieza.", kind: "bottle", pieceIds: ["pet-cap", "pet-label", "pet-body"] },
  { id: "glass", title: "Frasco de vidrio", blurb: "Quita el metal. El vidrio se coge por el cuerpo.", kind: "glass", pieceIds: ["glass-lid", "glass-body"] },
  { id: "box", title: "Caja de cartón", blurb: "Aplástala. No va con las cajas de leche.", kind: "box", pieceIds: ["paper-box"] },
  { id: "paper", title: "Hoja de papel", blurb: "Solo si está seca y limpia.", kind: "paper", pieceIds: ["paper-sheet"] },
  { id: "food", title: "Cáscara", blurb: "Orgánico, sin empaque.", kind: "peel", pieceIds: ["peel"] },
  { id: "trash", title: "Servilleta sucia", blurb: "Contamina el papel limpio.", kind: "napkin", pieceIds: ["napkin"] },
];

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
}

export const labCatalog = new LabCatalog();
