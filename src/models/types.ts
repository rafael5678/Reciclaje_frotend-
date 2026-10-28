export type Material = {
  code: string;
  name: string;
  fullName: string;
  category: string;
  objectName: string;
  container: string;
  containerDetail: string;
  steps: string[];
  primaryAction: string;
  recyclable: boolean;
  weightKg: number;
  co2Kg: number;
  accent: string;
  tone: string;
  warning: string;
  blurb: string;
};

export type Scan = {
  id: number;
  materialCode: string;
  materialName: string;
  fullName: string;
  category: string;
  objectName: string;
  confidence: number;
  container: string;
  containerDetail: string;
  tone: string;
  steps: string[];
  primaryAction: string;
  points: number;
  weightKg: number;
  co2Kg: number;
  createdAt: string;
  separatedWell: boolean;
  accent: string;
  warning: string;
  recyclable: boolean;
  hasPhoto?: boolean;
};

export type CategoryStat = {
  name: string;
  count: number;
  percent: number;
  color: string;
};

export type DayStat = {
  label: string;
  count: number;
  isToday: boolean;
};

export type Impact = {
  total: number;
  wellPercent: number;
  today: number;
  last7: number;
  previous7: number;
  night: number;
  weekChangePercent: number;
  points: number;
  weightKg: number;
  co2Kg: number;
  weekly: DayStat[];
  categories: CategoryStat[];
  recent: Scan[];
};

export type User = {
  id: number;
  name: string;
  email: string;
  guest?: boolean;
};

export type ServerHealth = {
  state: "checking" | "online" | "offline";
  database: boolean;
  gemini: boolean;
  models: { name: string; available: boolean; retryAt: number | null }[];
  perMinute: number;
  usedLastMinute: number;
  error?: string;
};

export type Session = {
  token: string;
  user: User;
};

export type BBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Score = {
  code: string;
  score: number;
};

export type ObjectGuide = {
  meaning: string;
  destination: string;
  actions: string[];
  tip: string;
};

export type VisionHit = {
  material: Material;
  confidence: number;
  bbox: BBox;
  inferenceMs: number;
  objectName: string;
  scores: Score[];
  segmented: boolean;
  engine?: string;
  model?: string;
  guide?: ObjectGuide;
};
