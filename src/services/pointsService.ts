/** Pasto drop-off points and OSM queries. */
export type PointKind = "Pilas" | "Electrónicos" | "Aceite" | "Plástico" | "Papel y cartón" | "Vidrio" | "Metal" | "Orgánico" | "Ropa";

export type RecyclingPoint = {
  id: string;
  lat: number;
  lon: number;
  name: string;
  kinds: PointKind[];
  hours: string | null;
  operator: string | null;
  isCentre: boolean;
  distanceKm: number;
  walkMin: number;
  driveMin: number;
  address?: string;
};

export type Place = { lat: number; lon: number; label: string };

export const POINT_KINDS: PointKind[] = ["Pilas", "Electrónicos", "Aceite", "Plástico", "Papel y cartón", "Vidrio", "Metal", "Orgánico", "Ropa"];

export const PASTO: Place = { lat: 1.21356, lon: -77.28111, label: "Centro de Pasto" };

export const PASTO_BOUNDS = { south: 1.155, north: 1.275, west: -77.345, east: -77.235 };

export const PASTO_BARRIOS: Place[] = [
  { label: "Centro", lat: 1.2136, lon: -77.2780 },
  { label: "Torobajo", lat: 1.2328, lon: -77.2915 },
  { label: "La Aurora", lat: 1.2055, lon: -77.2774 },
  { label: "San Vicente", lat: 1.2205, lon: -77.2656 },
  { label: "El Tejar", lat: 1.1988, lon: -77.2770 },
  { label: "Lorenzo", lat: 1.2080, lon: -77.2920 },
];

const TAG_KIND: Record<string, PointKind> = {
  batteries: "Pilas",
  car_batteries: "Pilas",
  electrical_items: "Electrónicos",
  small_appliances: "Electrónicos",
  mobile_phones: "Electrónicos",
  computers: "Electrónicos",
  printer_cartridges: "Electrónicos",
  light_bulbs: "Electrónicos",
  cooking_oil: "Aceite",
  engine_oil: "Aceite",
  plastic: "Plástico",
  plastic_bottles: "Plástico",
  plastic_packaging: "Plástico",
  PET: "Plástico",
  beverage_cartons: "Plástico",
  paper: "Papel y cartón",
  paper_packaging: "Papel y cartón",
  cardboard: "Papel y cartón",
  newspaper: "Papel y cartón",
  glass: "Vidrio",
  glass_bottles: "Vidrio",
  cans: "Metal",
  scrap_metal: "Metal",
  aluminium: "Metal",
  organic: "Orgánico",
  green_waste: "Orgánico",
  food_waste: "Orgánico",
  clothes: "Ropa",
  shoes: "Ropa",
};

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

const ALL_KINDS: PointKind[] = ["Plástico", "Papel y cartón", "Vidrio", "Metal", "Orgánico"];

const PASTO_DROPOFFS: Omit<RecyclingPoint, "distanceKm" | "walkMin" | "driveMin">[] = [
  {
    id: "pasto/emas-sede",
    lat: 1.21402,
    lon: -77.27853,
    name: "EMAS Pasto (Veolia) — sede",
    kinds: [...ALL_KINDS, "Pilas", "Electrónicos", "Aceite"],
    hours: "Lun–Vie 8:00–17:00",
    operator: "EMAS Pasto / Veolia",
    isCentre: true,
    address: "Cra. 24 #23-51",
  },
  {
    id: "pasto/emas-atencion",
    lat: 1.21315,
    lon: -77.27810,
    name: "EMAS — atención al cliente",
    kinds: [...ALL_KINDS, "Pilas", "Electrónicos"],
    hours: "Lun–Vie 8:00–17:00",
    operator: "EMAS Pasto / Veolia",
    isCentre: true,
    address: "Calle 22 #23-45",
  },
  {
    id: "pasto/udenar-torobajo",
    lat: 1.2328,
    lon: -77.2915,
    name: "Universidad de Nariño — Torobajo",
    kinds: [...ALL_KINDS, "Pilas", "Electrónicos"],
    hours: "Días hábiles, campus",
    operator: "Universidad de Nariño",
    isCentre: false,
    address: "Campus Torobajo",
  },
  {
    id: "pasto/potrerillo",
    lat: 1.2185,
    lon: -77.2720,
    name: "Plaza de mercado El Potrerillo",
    kinds: ["Orgánico", "Plástico", "Papel y cartón", "Vidrio", "Metal"],
    hours: "Mañanas de mercado",
    operator: "Plaza de mercado",
    isCentre: false,
    address: "El Potrerillo",
  },
  {
    id: "pasto/unicentro",
    lat: 1.2055,
    lon: -77.2774,
    name: "Centro comercial Unicentro Pasto",
    kinds: ["Pilas", "Electrónicos", "Plástico", "Papel y cartón"],
    hours: "Horario del centro comercial",
    operator: "Punto posconsumo",
    isCentre: false,
    address: "La Aurora",
  },
  {
    id: "pasto/alcaldia",
    lat: 1.2146,
    lon: -77.2789,
    name: "Alcaldía de Pasto — jornadas posconsumo",
    kinds: ["Pilas", "Electrónicos", "Aceite"],
    hours: "Jornadas anunciadas por la Alcaldía",
    operator: "Alcaldía de Pasto",
    isCentre: true,
    address: "Centro",
  },
];

export function inPasto(lat: number, lon: number) {
  return lat >= PASTO_BOUNDS.south && lat <= PASTO_BOUNDS.north && lon >= PASTO_BOUNDS.west && lon <= PASTO_BOUNDS.east;
}

export function localPastoPoints(lat: number, lon: number): RecyclingPoint[] {
  const origin = inPasto(lat, lon) ? { lat, lon } : PASTO;
  return PASTO_DROPOFFS.map((item) => withTravel(item, origin.lat, origin.lon)).sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function findPoints(lat: number, lon: number): Promise<RecyclingPoint[]> {
  const origin: Place = inPasto(lat, lon) ? { lat, lon, label: "Tu ubicación" } : PASTO;
  const merged = new Map<string, RecyclingPoint>();
  for (const point of localPastoPoints(origin.lat, origin.lon)) merged.set(point.id, point);
  for (const point of await findOsm(origin.lat, origin.lon)) {
    if (!inPasto(point.lat, point.lon)) continue;
    merged.set(point.id, withTravel(point, origin.lat, origin.lon));
  }
  return [...merged.values()].sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function searchPlace(text: string): Promise<Place | null> {
  const q = `${text.trim()}, Pasto, Nariño, Colombia`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=co&accept-language=es&q=${encodeURIComponent(q)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("No pude buscar ese lugar en Pasto");
  const rows = (await response.json()) as { lat: string; lon: string; display_name: string }[];
  if (!rows.length) return null;
  const place = { lat: Number(rows[0].lat), lon: Number(rows[0].lon), label: rows[0].display_name.split(",").slice(0, 2).join(",") };
  if (!inPasto(place.lat, place.lon)) return null;
  return place;
}

export function directionsUrl(point: RecyclingPoint, from?: Place): string {
  const origin = from ? `&origin=${from.lat},${from.lon}` : "";
  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${point.lat},${point.lon}&travelmode=walking`;
}

export function kindForMaterial(code: string): PointKind {
  if (code === "PAP") return "Papel y cartón";
  if (code === "VID") return "Vidrio";
  if (code === "MET") return "Metal";
  if (code === "ORG") return "Orgánico";
  if (code === "GEN") return "Electrónicos";
  return "Plástico";
}

export function formatWalk(point: RecyclingPoint) {
  if (point.walkMin < 2) return "Menos de 2 min a pie";
  if (point.walkMin < 60) return `${point.walkMin} min a pie`;
  const hours = Math.floor(point.walkMin / 60);
  const mins = point.walkMin % 60;
  return mins ? `${hours} h ${mins} min a pie` : `${hours} h a pie`;
}

export function formatDrive(point: RecyclingPoint) {
  if (point.driveMin < 2) return "1–2 min en carro";
  return `${point.driveMin} min en carro`;
}

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

async function findOsm(lat: number, lon: number): Promise<RecyclingPoint[]> {
  const box = `${PASTO_BOUNDS.south},${PASTO_BOUNDS.west},${PASTO_BOUNDS.north},${PASTO_BOUNDS.east}`;
  const query = `[out:json][timeout:25];(node["amenity"="recycling"](${box});way["amenity"="recycling"](${box});node["recycling_type"="centre"](${box});way["recycling_type"="centre"](${box}););out center tags 80;`;
  for (const endpoint of OVERPASS) {
    try {
      const response = await fetch(endpoint, { method: "POST", body: new URLSearchParams({ data: query }) });
      if (!response.ok) continue;
      const data = (await response.json()) as { elements: OverpassElement[] };
      return data.elements.map((element) => toPoint(element, lat, lon)).filter((point): point is RecyclingPoint => point !== null);
    } catch {
      continue;
    }
  }
  return [];
}

function toPoint(element: OverpassElement, fromLat: number, fromLon: number): RecyclingPoint | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (lat === undefined || lon === undefined || !inPasto(lat, lon)) return null;
  const tags = element.tags ?? {};
  const kinds = new Set<PointKind>();
  for (const [key, value] of Object.entries(tags)) {
    if (!key.startsWith("recycling:") || value !== "yes") continue;
    const kind = TAG_KIND[key.slice("recycling:".length)];
    if (kind) kinds.add(kind);
  }
  const isCentre = tags.recycling_type === "centre";
  return withTravel(
    {
      id: `${element.type}/${element.id}`,
      lat,
      lon,
      name: tags.name || tags.operator || (isCentre ? "Centro de reciclaje" : "Punto de reciclaje"),
      kinds: POINT_KINDS.filter((kind) => kinds.has(kind)),
      hours: tags.opening_hours ?? null,
      operator: tags.operator && tags.operator !== tags.name ? tags.operator : null,
      isCentre,
      address: tags["addr:street"] ?? undefined,
    },
    fromLat,
    fromLon,
  );
}

function withTravel(point: Omit<RecyclingPoint, "distanceKm" | "walkMin" | "driveMin"> & Partial<Pick<RecyclingPoint, "distanceKm" | "walkMin" | "driveMin">>, fromLat: number, fromLon: number): RecyclingPoint {
  const distanceKm = distance(fromLat, fromLon, point.lat, point.lon);
  return {
    ...point,
    distanceKm,
    walkMin: Math.max(1, Math.round((distanceKm / 4.5) * 60)),
    driveMin: Math.max(1, Math.round((distanceKm / 22) * 60)),
  };
}

function distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
