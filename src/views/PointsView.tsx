/** Mapa de puntos de reciclaje en Pasto. */
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icons";
import {
  directionsUrl,
  findPoints,
  localPastoPoints,
  formatDrive,
  formatWalk,
  inPasto,
  PASTO,
  PASTO_BARRIOS,
  PASTO_BOUNDS,
  POINT_KINDS,
  searchPlace,
  type PointKind,
  type RecyclingPoint,
} from "../services/pointsService";

type Status = "locating" | "loading" | "ready" | "error";

export function PointsView() {
  const [params] = useSearchParams();
  const initial = POINT_KINDS.find((kind) => kind === params.get("tipo")) ?? "Todos";
  const mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.CircleMarker>());
  const [origin, setOrigin] = useState<{ lat: number; lon: number; label: string }>(PASTO);
  const [points, setPoints] = useState<RecyclingPoint[]>([]);
  const [filter, setFilter] = useState<PointKind | "Todos">(initial);
  const [status, setStatus] = useState<Status>("locating");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!mapNode.current || map.current) return;
    const bounds = L.latLngBounds(
      [PASTO_BOUNDS.south, PASTO_BOUNDS.west],
      [PASTO_BOUNDS.north, PASTO_BOUNDS.east],
    );
    const instance = L.map(mapNode.current, {
      zoomControl: true,
      attributionControl: true,
      maxBounds: bounds.pad(0.08),
      maxBoundsViscosity: 1,
      minZoom: 12,
    }).setView([PASTO.lat, PASTO.lon], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: "osm-dark",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance);
    layer.current = L.layerGroup().addTo(instance);
    map.current = instance;
    return () => {
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setOrigin(PASTO);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setOrigin(inPasto(lat, lon) ? { lat, lon, label: "Tu ubicación" } : PASTO);
      },
      () => setOrigin(PASTO),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    let alive = true;
    setPoints(localPastoPoints(origin.lat, origin.lon));
    setStatus("ready");
    setMessage("");
    findPoints(origin.lat, origin.lon)
      .then((found) => {
        if (alive) setPoints(found);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [origin]);

  const visible = useMemo(
    () => (filter === "Todos" ? points : points.filter((point) => point.kinds.includes(filter) || (filter === "Electrónicos" && point.kinds.includes("Pilas")))),
    [points, filter],
  );

  useEffect(() => {
    const instance = map.current;
    const group = layer.current;
    if (!instance || !group) return;
    group.clearLayers();
    markers.current.clear();
    L.circleMarker([origin.lat, origin.lon], { radius: 9, color: "#ffffff", weight: 3, fillColor: "#19c5c5", fillOpacity: 1 })
      .bindTooltip(origin.label)
      .addTo(group);
    const bounds = L.latLngBounds([[origin.lat, origin.lon]]);
    for (const point of visible) {
      const marker = L.circleMarker([point.lat, point.lon], {
        radius: point.isCentre ? 9 : 7,
        color: "#053222",
        weight: 2,
        fillColor: point.isCentre ? "#ffd166" : "#1de28d",
        fillOpacity: 0.95,
      })
        .bindPopup(popupHtml(point, origin))
        .addTo(group);
      markers.current.set(point.id, marker);
      bounds.extend([point.lat, point.lon]);
    }
    instance.fitBounds(bounds.pad(0.18), { maxZoom: 15, animate: true });
  }, [visible, origin]);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const place = await searchPlace(query);
      if (!place) {
        setStatus("ready");
        setMessage("Ese lugar no está en Pasto. Prueba un barrio: Centro, Torobajo, La Aurora…");
        return;
      }
      setOrigin(place);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "No pude buscar ese barrio");
    }
  }

  function focus(point: RecyclingPoint) {
    const marker = markers.current.get(point.id);
    map.current?.flyTo([point.lat, point.lon], 17, { duration: 0.8 });
    marker?.openPopup();
  }

  const nearest = visible[0];

  return (
    <div className="points-page">
      <header className="page-hero">
        <h1>Puntos de <em>reciclaje en Pasto</em></h1>
        <p>Dónde llevar lo que EcoScan te dice que separes: plástico, papel, vidrio, pilas y RAEE, cerca de ti.</p>
      </header>
      <form className="points-search glass-card" onSubmit={(event) => void search(event)}>
        <Icon name="pin" size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Barrio en Pasto (Centro, Torobajo…)" />
        <button className="cta cta-glow cta-sm">Buscar</button>
      </form>
      <div className="city-chips" role="group" aria-label="Barrios de Pasto">
        <span className="city-chips-label">Barrio:</span>
        {PASTO_BARRIOS.map((place) => (
          <button key={place.label} type="button" className={origin.label === place.label ? "is-on" : ""} onClick={() => setOrigin(place)}>
            {place.label}
          </button>
        ))}
        <button type="button" className={origin.label === "Tu ubicación" ? "is-on" : ""} onClick={() => locateMe(setOrigin)}>
          Mi ubicación
        </button>
      </div>
      <div className="kind-chips" role="group" aria-label="Filtrar por tipo">
        {(["Todos", ...POINT_KINDS] as const).map((kind) => (
          <button key={kind} className={kind === filter ? "is-on" : ""} onClick={() => setFilter(kind)}>{kind}</button>
        ))}
      </div>
      <section className="points-grid">
        <div className="points-map glass-card">
          <div ref={mapNode} className="leaflet-host" />
        </div>
        <aside className="glass-card points-list">
          <h2>{status === "ready" ? `${visible.length} ${visible.length === 1 ? "punto" : "puntos"} en Pasto` : "Puntos cercanos"}</h2>
          {status === "locating" ? <p className="loading">Ubicándote en Pasto…</p> : null}
          {nearest && status === "ready" ? (
            <p className="hint">Lo más cerca: <strong>{nearest.name}</strong> · {formatWalk(nearest)} · {formatDrive(nearest)}</p>
          ) : null}
          {message ? <p className={status === "error" ? "sheet-error" : "hint"}>{message}</p> : null}
          {status === "ready" && visible.length === 0 ? (
            <p className="empty">No hay puntos para «{filter}» en Pasto. Prueba Todos o Electrónicos.</p>
          ) : null}
          <ul>
            {visible.slice(0, 40).map((point) => (
              <li key={point.id}>
                <button className="point-row" onClick={() => focus(point)}>
                  <strong>{point.name}</strong>
                  <small>
                    {point.distanceKm < 1 ? `${Math.round(point.distanceKm * 1000)} m` : `${point.distanceKm.toFixed(1)} km`}
                    {` · ${formatWalk(point)} · ${formatDrive(point)}`}
                    {point.address ? ` · ${point.address}` : ""}
                  </small>
                  {point.kinds.length ? <span className="point-kinds">{point.kinds.join(" · ")}</span> : <span className="point-kinds dim">Aprovechables</span>}
                </button>
                <a href={directionsUrl(point, origin)} target="_blank" rel="noreferrer" className="point-go">Cómo llegar</a>
              </li>
            ))}
          </ul>
          <p className="points-note">Solo Pasto. Combina sitios de entrega conocidos y OpenStreetMap.</p>
        </aside>
      </section>
    </div>
  );
}

function locateMe(setOrigin: (place: { lat: number; lon: number; label: string }) => void) {
  if (!("geolocation" in navigator)) {
    setOrigin(PASTO);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      setOrigin(inPasto(lat, lon) ? { lat, lon, label: "Tu ubicación" } : PASTO);
    },
    () => setOrigin(PASTO),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
  );
}

function popupHtml(point: RecyclingPoint, origin: { lat: number; lon: number; label: string }): string {
  const safe = (value: string) => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
  const kinds = point.kinds.length ? point.kinds.join(" · ") : "Aprovechables";
  return `<strong>${safe(point.name)}</strong><br/><span>${safe(kinds)}</span><br/><small>${safe(formatWalk(point))} · ${safe(formatDrive(point))}</small>${point.address ? `<br/><small>${safe(point.address)}</small>` : ""}<br/><a href="${directionsUrl(point, origin)}" target="_blank" rel="noreferrer">Cómo llegar</a>`;
}
