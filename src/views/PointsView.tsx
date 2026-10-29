import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icons";
import { directionsUrl, findPoints, POINT_KINDS, searchPlace, type PointKind, type RecyclingPoint } from "../services/pointsService";

type Status = "locating" | "loading" | "ready" | "need-place" | "error";

const CITIES = [
  { name: "Bogotá", lat: 4.6097, lon: -74.0817 },
  { name: "Medellín", lat: 6.2442, lon: -75.5812 },
  { name: "Cali", lat: 3.4516, lon: -76.5320 },
  { name: "Barranquilla", lat: 10.9685, lon: -74.7813 },
  { name: "Bucaramanga", lat: 7.1254, lon: -73.1198 },
];


export function PointsView() {
  const [params] = useSearchParams();
  const initial = POINT_KINDS.find((kind) => kind === params.get("tipo")) ?? "Todos";
  const mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.CircleMarker>());
  const [origin, setOrigin] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [points, setPoints] = useState<RecyclingPoint[]>([]);
  const [filter, setFilter] = useState<PointKind | "Todos">(initial);
  const [status, setStatus] = useState<Status>("locating");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!mapNode.current || map.current) return;
    const instance = L.map(mapNode.current, { zoomControl: true, attributionControl: true }).setView([4.6, -74.1], 5);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
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
      setStatus("need-place");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setOrigin({ lat: position.coords.latitude, lon: position.coords.longitude, label: "Tu ubicación" }),
      () => {
        setStatus("need-place");
        setMessage("No tengo permiso para ver tu ubicación. Escribe tu barrio o ciudad.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    if (!origin) return;
    let alive = true;
    setStatus("loading");
    setMessage("");
    findPoints(origin.lat, origin.lon)
      .then((found) => {
        if (!alive) return;
        setPoints(found);
        setStatus("ready");
      })
      .catch((err: Error) => {
        if (!alive) return;
        setStatus("error");
        setMessage(err.message);
      });
    return () => {
      alive = false;
    };
  }, [origin]);

  const visible = useMemo(
    () => (filter === "Todos" ? points : points.filter((point) => point.kinds.includes(filter))),
    [points, filter],
  );

  useEffect(() => {
    const instance = map.current;
    const group = layer.current;
    if (!instance || !group || !origin) return;
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
        .bindPopup(popupHtml(point))
        .addTo(group);
      markers.current.set(point.id, marker);
      if (point.distanceKm <= 2.5) bounds.extend([point.lat, point.lon]);
    }
    instance.fitBounds(bounds.pad(0.25), { maxZoom: 15 });
  }, [visible, origin]);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const place = await searchPlace(query);
      if (!place) {
        setStatus("need-place");
        setMessage("No encontré ese lugar. Prueba con «barrio, ciudad».");
        return;
      }
      setOrigin(place);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "No pude buscar ese lugar");
    }
  }

  function focus(point: RecyclingPoint) {
    const marker = markers.current.get(point.id);
    map.current?.flyTo([point.lat, point.lon], 17, { duration: 0.8 });
    marker?.openPopup();
  }

  return (
    <div className="points-page">
      <header className="page-hero">
        <h1>Puntos de <em>reciclaje</em></h1>
        <p>Dónde llevar pilas, electrónicos, aceite y más, cerca de ti.</p>
      </header>
      <form className="points-search glass-card" onSubmit={(event) => void search(event)}>
        <Icon name="pin" size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={origin ? `Cerca de: ${origin.label}` : "Escribe tu barrio o ciudad"} />
        <button className="cta cta-glow cta-sm">Buscar</button>
      </form>
      <div className="city-chips" role="group" aria-label="Ciudades sugeridas">
        <span className="city-chips-label">Explorar ciudad:</span>
        {CITIES.map((c) => (
          <button key={c.name} type="button" className={origin?.label === c.name ? "is-on" : ""} onClick={() => setOrigin({ lat: c.lat, lon: c.lon, label: c.name })}>
            {c.name}
          </button>
        ))}
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
          <h2>{status === "ready" ? `${visible.length} ${visible.length === 1 ? "punto" : "puntos"} a menos de 5 km` : "Puntos cercanos"}</h2>
          {status === "locating" ? <p className="loading">Buscando tu ubicación…</p> : null}
          {status === "loading" ? <p className="loading">Consultando OpenStreetMap…</p> : null}
          {message ? <p className={status === "error" ? "sheet-error" : "hint"}>{message}</p> : null}
          {status === "ready" && visible.length === 0 ? (
            <p className="empty">No hay puntos registrados para «{filter}» en esta zona. Prueba otro filtro u otro barrio.</p>
          ) : null}
          <ul>
            {visible.slice(0, 40).map((point) => (
              <li key={point.id}>
                <button className="point-row" onClick={() => focus(point)}>
                  <strong>{point.name}</strong>
                  <small>{point.distanceKm < 1 ? `${Math.round(point.distanceKm * 1000)} m` : `${point.distanceKm.toFixed(1)} km`}{point.hours ? ` · ${point.hours}` : ""}</small>
                  {point.kinds.length ? <span className="point-kinds">{point.kinds.join(" · ")}</span> : <span className="point-kinds dim">Tipo no especificado</span>}
                </button>
                <a href={directionsUrl(point)} target="_blank" rel="noreferrer" className="point-go">Cómo llegar</a>
              </li>
            ))}
          </ul>
          <p className="points-note">
            Datos de la comunidad de OpenStreetMap. ¿Falta un punto?{" "}
            <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">Agrégalo</a>.
          </p>
        </aside>
      </section>
    </div>
  );
}

function popupHtml(point: RecyclingPoint): string {
  const safe = (value: string) => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
  const kinds = point.kinds.length ? point.kinds.join(" · ") : "Tipo no especificado";
  return `<strong>${safe(point.name)}</strong><br/><span>${safe(kinds)}</span>${point.hours ? `<br/><small>${safe(point.hours)}</small>` : ""}<br/><a href="${directionsUrl(point)}" target="_blank" rel="noreferrer">Cómo llegar</a>`;
}
