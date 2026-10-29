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
};

export type Place = { lat: number; lon: number; label: string };

export const POINT_KINDS: PointKind[] = ["Pilas", "Electrónicos", "Aceite", "Plástico", "Papel y cartón", "Vidrio", "Metal", "Orgánico", "Ropa"];

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
const RADIUS_M = 5000;

export async function findPoints(lat: number, lon: number): Promise<RecyclingPoint[]> {
  const query = `[out:json][timeout:25];(node["amenity"="recycling"](around:${RADIUS_M},${lat},${lon});way["amenity"="recycling"](around:${RADIUS_M},${lat},${lon}););out center tags 250;`;
  let lastError: unknown = null;
  for (const endpoint of OVERPASS) {
    try {
      const response = await fetch(endpoint, { method: "POST", body: new URLSearchParams({ data: query }) });
      if (!response.ok) throw new Error(`OpenStreetMap respondió ${response.status}`);
      const data = (await response.json()) as { elements: OverpassElement[] };
      return data.elements
        .map((element) => toPoint(element, lat, lon))
        .filter((point): point is RecyclingPoint => point !== null)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No pude consultar los puntos de reciclaje");
}

export async function searchPlace(text: string): Promise<Place | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("No pude buscar ese lugar");
  const rows = (await response.json()) as { lat: string; lon: string; display_name: string }[];
  if (!rows.length) return null;
  return { lat: Number(rows[0].lat), lon: Number(rows[0].lon), label: rows[0].display_name.split(",").slice(0, 2).join(",") };
}

export function directionsUrl(point: RecyclingPoint): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lon}`;
}

export function kindForMaterial(code: string): PointKind {
  if (code === "PAP") return "Papel y cartón";
  if (code === "VID") return "Vidrio";
  if (code === "MET") return "Metal";
  if (code === "ORG") return "Orgánico";
  if (code === "GEN") return "Electrónicos";
  return "Plástico";
}

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function toPoint(element: OverpassElement, fromLat: number, fromLon: number): RecyclingPoint | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (lat === undefined || lon === undefined) return null;
  const tags = element.tags ?? {};
  const kinds = new Set<PointKind>();
  for (const [key, value] of Object.entries(tags)) {
    if (!key.startsWith("recycling:") || value !== "yes") continue;
    const kind = TAG_KIND[key.slice("recycling:".length)];
    if (kind) kinds.add(kind);
  }
  const isCentre = tags.recycling_type === "centre";
  return {
    id: `${element.type}/${element.id}`,
    lat,
    lon,
    name: tags.name || tags.operator || (isCentre ? "Centro de reciclaje" : "Punto de reciclaje"),
    kinds: POINT_KINDS.filter((kind) => kinds.has(kind)),
    hours: tags.opening_hours ?? null,
    operator: tags.operator && tags.operator !== tags.name ? tags.operator : null,
    isCentre,
    distanceKm: distance(fromLat, fromLon, lat, lon),
  };
}

function distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
