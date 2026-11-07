/** Last scan result and recycling steps. */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { dropAdvice, formatWalk } from "../services/pointsService";
import { Icon, stepIcon } from "../components/Icons";
import { WasteArt } from "../components/WasteArt";
import type { ObjectGuide, Scan } from "../models/types";
import { formatConfidence } from "../services/format";

export function ResultView() {
  const navigate = useNavigate();
  const location = useLocation();
  const wide = location.pathname.startsWith("/panel");
  const fromState = (location.state as { scan?: Scan } | null)?.scan ?? null;
  const scan = fromState ?? readStored();
  const guide = readGuide();
  const scanPath = wide ? "/panel/escanear" : "/app/escaner";
  const donePath = wide ? "/panel" : "/app/impacto";
  const advice = scan ? dropAdvice(scan.materialCode, scan.container) : null;

  if (!scan) {
    return (
      <div className="result">
        <p className="empty">No hay una clasificación reciente.</p>
        <button className="cta" onClick={() => navigate(scanPath)}>Escanear</button>
      </div>
    );
  }

  return (
    <div className={wide ? "result is-wide" : "result"}>
      <header className="result-top">
        <button className="icon-btn" onClick={() => navigate(scanPath)} aria-label="Volver">
          <Icon name="close" size={18} />
        </button>
        <span>Resultado</span>
      </header>
      <article className="result-card">
        <div>
          <p className="kicker">¡Clasificado!</p>
          <h1>{scan.materialCode}</h1>
          <p>{scan.fullName}</p>
          <small>{formatConfidence(scan.confidence)} de certeza</small>
        </div>
        <WasteArt code={scan.materialCode} />
      </article>
      <section className="where-card">
        <p>¿Dónde lo tiro?</p>
        <div>
          <span className={`bin-mark tone-${scan.tone}`}><Icon name="bin" size={18} /></span>
          <div>
            <strong>Contenedor {scan.container.toLowerCase()}</strong>
            <span>{guide?.destination || scan.containerDetail}</span>
          </div>
        </div>
        {advice ? (
          <div className="drop-split">
            <article>
              <p>En la Cooperativa</p>
              <strong>{advice.campusTitle}</strong>
              <span>{advice.campusBody}</span>
              {advice.campusPoint ? <small>{advice.campusPoint.name}</small> : null}
            </article>
            <article>
              <p>En Pasto</p>
              <strong>{advice.cityPoint ? advice.cityPoint.name : "Punto de la ciudad"}</strong>
              <span>
                {advice.cityPoint
                  ? `${formatWalk(advice.cityPoint)} desde Torobajo · ${advice.kind}`
                  : "Abre el mapa para EMAS, Unicentro y plazas."}
              </span>
            </article>
          </div>
        ) : null}
      </section>
      {guide?.meaning ? <p className="warning">{guide.meaning}</p> : null}
      <section className="steps-card">
        <p>Qué tienes que hacer</p>
        {(guide?.actions.length ? guide.actions : scan.steps).map((step) => (
          <div className="step-line" key={step}>
            <Icon name={stepIcon(step)} size={16} />
            <span>{step}</span>
            <Icon name="check" size={16} />
          </div>
        ))}
      </section>
      {guide?.tip ? <p className="warning">{guide.tip}</p> : scan.warning ? <p className="warning">{scan.warning}</p> : null}
      {scan.materialCode === "PET" || scan.materialCode === "HDPE" ? (
        <Link className="ghost-btn points-link" to="/panel/laboratorio">
          <Icon name="spark" size={16} />
          Separar tapa, etiqueta y cuerpo
        </Link>
      ) : null}
      <Link className="ghost-btn points-link" to="/panel/laboratorio">
        <Icon name="spark" size={16} />
        Laboratorio: ruta Pasto y replay IA
      </Link>
      <Link className="ghost-btn points-link" to={advice?.mapHref ?? "/panel/puntos?campus=ucc"}>
        <Icon name="map" size={16} />
        Ver mapa: campus UCC y Pasto
      </Link>
      <button className="cta" onClick={() => navigate(donePath)}>Aceptar</button>
      <button className="text-btn" onClick={() => navigate(scanPath)}>Escanear otro</button>
    </div>
  );
}

function readGuide(): ObjectGuide | null {
  try {
    const raw = sessionStorage.getItem("ecoscan.lastGuide");
    return raw ? (JSON.parse(raw) as ObjectGuide) : null;
  } catch {
    return null;
  }
}

function readStored(): Scan | null {
  try {
    const raw = sessionStorage.getItem("ecoscan.last");
    return raw ? (JSON.parse(raw) as Scan) : null;
  } catch {
    return null;
  }
}
