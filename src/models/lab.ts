/** Sorting-lab domain types. */

export type LabBinId = "yellow" | "blue" | "green" | "black" | "brown";

export type PrepKind = "unscrew" | "peel" | "none";

export type LabBin = {
  id: LabBinId;
  title: string;
  detail: string;
  tone: string;
};

export type LabPiece = {
  id: string;
  title: string;
  kicker: string;
  binId: LabBinId;
  prep: PrepKind;
  lockedUntil: string[];
  hint: string;
};

export type SpecimenKind = "bottle" | "glass" | "paper" | "box" | "peel" | "napkin" | "jug" | "carton" | "can";

export type LabSpecimen = {
  id: string;
  title: string;
  blurb: string;
  kind: SpecimenKind;
  pieceIds: string[];
  materialCode: string;
  fromScan?: boolean;
  container?: string;
  steps?: string[];
  confidence?: number;
};

export type LabThrowResult = {
  correct: boolean;
  delta: number;
  points: number;
  labPenalty: number;
  hint: string;
  pieceTitle: string;
  binTitle: string;
  expectedBin: string;
};
