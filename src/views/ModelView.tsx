import { useState } from "react";
import { evaluateSample, readVisionMeta, sampleKinds, type SampleKind } from "../services/visionService";

export function ModelView() {
  const meta = readVisionMeta();
  const [rows, setRows] = useState<{ kind: SampleKind; got: string; confidence: number; ok: boolean }[]>([]);

  function run() {
    const next = sampleKinds().map((kind) => {
      const hit = evaluateSample(kind);
      const got = hit?.material.code ?? "—";
      return { kind, got, confidence: hit?.confidence ?? 0, ok: got === kind };
    });
    setRows(next);
  }

  const passed = rows.filter((row) => row.ok).length;

  return (
    <div className="model-page">
      <header className="page-head">
        <div>
          <h1>Cómo clasifica</h1>
          <p>Gemini mira la foto, dice qué objeto es y explica en qué contenedor va. MIRA y TrashNet ayudan cuando no hay conexión con Gemini.</p>
        </div>
      </header>
      <section className="model-stats">
        <article className="panel-card"><span>Estado</span><strong>Listo en la nube</strong></article>
        <article className="panel-card"><span>Última inferencia</span><strong>{meta ? `${meta.ms} ms` : "Aún no corre"}</strong></article>
        <article className="panel-card"><span>Motor</span><strong>Gemini + MIRA</strong></article>
      </section>
      <section className="panel-card pipeline">
        <h2>Cómo decide</h2>
        <ol>
          <li>MIRA, un YOLO11, localiza el residuo en cualquier parte del encuadre.</li>
          <li>TrashNet mira el recorte: cartón, vidrio, metal, papel, plástico o basura.</li>
          <li>Si hay tapa roja, hoja impresa, lápiz, celular o control, gana esa forma.</li>
          <li>Los dos modelos se ponen de acuerdo y eligen el contenedor.</li>
          <li>Gemini explica qué es el objeto, a qué contenedor va y qué tienes que hacer.</li>
          <li>Si confirmas, el resultado se guarda en tu historial.</li>
        </ol>
      </section>
      <section className="panel-card">
        <header className="section-head">
          <h2>Prueba con muestras locales</h2>
          <button className="cta cta-inline" onClick={run}>Probar las 8 clases</button>
        </header>
        {rows.length > 0 ? (
          <>
            <p className="hint">{passed} de {rows.length} muestras coincidieron con su material.</p>
            <ul className="sample-list">
              {rows.map((row) => (
                <li key={row.kind} className={row.ok ? "ok" : "bad"}>
                  <b>{row.kind}</b>
                  <span>detectó {row.got}</span>
                  <small>{Math.round(row.confidence * 100)}%</small>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="empty">Genera ocho imágenes de prueba en el navegador y clasifícalas sin cámara.</p>}
      </section>
    </div>
  );
}
