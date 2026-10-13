import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BinPill } from "../components/Charts";
import { Icon, stepIcon } from "../components/Icons";
import { MATERIALS, materialByCode } from "../models/catalog";
import type { BBox, VisionHit } from "../models/types";
import { formatConfidence } from "../services/format";
import { scanService } from "../services/scanService";
import { loadMira } from "../services/miraService";
import { ScanBrain } from "../services/scanBrain";
import { loadTrashnet } from "../services/trashnetService";
import { useSession } from "./SessionProvider";

export function ScannerView({ variant = "phone" }: { variant?: "phone" | "desk" }) {
  const navigate = useNavigate();
  const { bump } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const photoJob = useRef(0);
  const desk = variant === "desk";
  const [source, setSource] = useState<"camera" | "photo">("photo");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">(desk ? "user" : "environment");
  const [hit, setHit] = useState<VisionHit | null>(null);
  const [selected, setSelected] = useState("PET");
  const [manual, setManual] = useState(false);
  const [settings, setSettings] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [camError, setCamError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ms, setMs] = useState(12);
  const [miraReady, setMiraReady] = useState(false);
  const [trashReady, setTrashReady] = useState(false);
  const [camRetry, setCamRetry] = useState(0);

  useEffect(() => {
    let stopped = false;
    void loadMira()
      .then(() => {
        if (!stopped) setMiraReady(true);
      })
      .catch(() => undefined);
    void loadTrashnet().then((model) => {
      if (!stopped && model) setTrashReady(true);
    });
    return () => {
      stopped = true;
    };
  }, []);

  useEffect(() => {
    if (source !== "camera") return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const camera: HTMLVideoElement = video;
    const buffer: HTMLCanvasElement = canvas;
    const brain = new ScanBrain();
    const loopId = { current: 0 };
    const lastDraw = { current: 0 };
    const mira = { ready: miraReady };
    let stream: MediaStream | null = null;
    let stopped = false;
    let inflight = false;

    async function start() {
      setCamError("");
      try {
        stream = await openCamera(facing);
      } catch {
        if (!stopped) setCamError("Chrome bloqueó la cámara. En el candado de la barra, deja Cámara encendida y pulsa Reintentar.");
        return;
      }
      if (stopped) {
        stopStream(stream);
        return;
      }
      camera.srcObject = stream;
      await camera.play().catch(() => undefined);
      const loop = (time: number) => {
        loopId.current = requestAnimationFrame(loop);
        if (inflight || time - lastDraw.current < 90) return;
        if (camera.readyState < 2 || !camera.videoWidth) return;
        lastDraw.current = time;
        const width = 360;
        const height = Math.max(96, Math.round(width * (camera.videoHeight / camera.videoWidth)));
        buffer.width = width;
        buffer.height = height;
        const context = buffer.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(camera, 0, 0, width, height);
        const image = context.getImageData(0, 0, width, height);
        inflight = true;
        void (async () => {
          try {
            const next = await brain.analyze(image, buffer, mira.ready || miraReady);
            if (stopped) return;
            setMs(Math.max(1, Math.round(next?.inferenceMs || brain.lastMs)));
            setHit(next);
          } finally {
            inflight = false;
          }
        })();
      };
      loopId.current = requestAnimationFrame(loop);
    }

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(loopId.current);
      stopStream(stream);
      camera.srcObject = null;
    };
  }, [facing, camRetry, source, miraReady]);

  useEffect(() => {
    if (hit && !manual) setSelected(hit.material.code);
  }, [hit, manual]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const material = materialByCode(selected);
  const objectName = hit && !manual && selected === hit.material.code ? hit.objectName : material.objectName;
  const media = source === "photo" ? photoRef.current : videoRef.current;
  const box = hit && stageRef.current && media ? placeBox(hit.bbox, media, stageRef.current, source === "camera" && facing === "user") : null;
  const home = variant === "desk" ? "/panel" : "/";
  const resultPath = variant === "desk" ? "/panel/resultado" : "/app/resultado";

  async function readPhotoLocal(url: string, job: number) {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("lienzo");
    await Promise.all([loadMira().catch(() => null), loadTrashnet()]);
    if (job !== photoJob.current) return;
    setMiraReady(true);
    setTrashReady(true);
    const image = await decodeImage(url);
    if (job !== photoJob.current) return;
    const width = 640;
    const height = Math.max(160, Math.round(width * (image.height / image.width)));
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("lienzo");
    context.drawImage(image, 0, 0, width, height);
    const frame = context.getImageData(0, 0, width, height);
    const next = await new ScanBrain().analyzeStill(frame, canvas, true);
    if (job !== photoJob.current) return;
    setMs(Math.max(1, Math.round(next?.inferenceMs || 1)));
    setHit(next);
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const url = URL.createObjectURL(file);
    const job = photoJob.current + 1;
    photoJob.current = job;
    setPhotoUrl(url);
    setSource("photo");
    setHit(null);
    setReading(true);
    setSaveError("");
    setManual(false);
    setCorrecting(false);
    try {
      const next = await scanService.analyzePhoto(file);
      if (job !== photoJob.current) return;
      setMs(Math.max(1, Math.round(next.inferenceMs || 1)));
      setHit(next);
      setMiraReady(true);
      setTrashReady(true);
    } catch {
      try {
        await readPhotoLocal(url, job);
      } catch {
        if (job !== photoJob.current) return;
        setSaveError("No pude leer esa foto. Prueba con JPG o PNG.");
        setHit(null);
      }
    } finally {
      if (job === photoJob.current) setReading(false);
    }
  }

  async function register() {
    if (!hit || busy) return;
    setBusy(true);
    setSaveError("");
    try {
      const scan = await scanService.register({
        materialCode: material.code,
        objectName,
        confidence: hit.confidence,
        separatedWell: hit.confidence >= 0.72,
      });
      sessionStorage.setItem("ecoscan.last", JSON.stringify(scan));
      if (hit.guide) sessionStorage.setItem("ecoscan.lastGuide", JSON.stringify(hit.guide));
      else sessionStorage.removeItem("ecoscan.lastGuide");
      bump();
      navigate(resultPath, { state: { scan } });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={desk ? "scan scan-desk" : "scan"}>
      <div
        className="scan-stage"
        ref={stageRef}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void pickPhoto(event.dataTransfer.files?.[0]);
        }}
      >
      {source === "camera" ? (
        <video ref={videoRef} className={facing === "user" ? "scan-video mirror" : "scan-video"} playsInline muted autoPlay />
      ) : photoUrl ? (
        <img ref={photoRef} src={photoUrl} alt="Foto a analizar" className="scan-photo" />
      ) : (
        <div className="scan-drop">
          <Icon name="scan" />
          <strong>Suelta una foto aquí</strong>
          <p>O pulsa Subir foto. JPG, PNG o captura del celular.</p>
        </div>
      )}
      <canvas ref={canvasRef} className="scan-buffer" />
      <div className="scan-shade" />
      <div className="scan-top">
        <button className="icon-btn" onClick={() => navigate(home)} aria-label="Cerrar">
          <Icon name="close" />
        </button>
        <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Ajustes de cámara">
          <Icon name="gear" />
        </button>
      </div>
      <div className="scan-badges">
        <span className="badge">IA · {ms} ms</span>
        <span className="badge badge-live">{source === "photo" ? "FOTO" : "CÁMARA"}</span>
        <span className="badge">{hit?.engine === "gemini" ? "Gemini + catálogo" : hit?.engine === "forma" ? "Forma del objeto" : miraReady && trashReady ? "MIRA + TrashNet" : "Cargando modelos"}</span>
      </div>
      {box && hit ? (
        <div className="bbox" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}>
          <div className={box.y < 0.18 ? "bbox-tag inside" : "bbox-tag"}>
            <b>
              {material.code} · {formatConfidence(hit.confidence)} confianza
            </b>
            <small>{material.fullName}</small>
          </div>
          <i /><i /><i /><i />
        </div>
      ) : null}
      </div>

      <section className="scan-sheet">
        <div className="source-row">
          <button type="button" className={source === "camera" ? "is-on" : ""} onClick={() => { setSource("camera"); setHit(null); }}>
            Cámara
          </button>
          <PhotoButton active={source === "photo"} onPick={(file) => void pickPhoto(file)}>
            Subir foto
          </PhotoButton>
        </div>
        {source === "camera" && camError ? (
          <div className="scan-wait">
            <Icon name="scan" />
            <div>
              <strong>Falta el permiso de la cámara</strong>
              <p>{camError}</p>
              <button className="cta cta-inline" onClick={() => setCamRetry((value) => value + 1)}>
                Reintentar cámara
              </button>
            </div>
          </div>
        ) : null}
        {reading ? <p className="hint">Gemini está viendo la foto y preparando qué hacer con el objeto…</p> : null}
        {saveError && !hit ? <p className="sheet-error">{saveError}</p> : null}
        {!hit && !camError && !reading ? (
          <div className="scan-wait">
            <Icon name="scan" />
            <div>
              <strong>Sube cualquier foto del objeto</strong>
              <p>Botella, lápiz, hoja, cartón, comida, lata o basura. Puedes elegir otra foto las veces que quieras.</p>
              <PhotoButton active className="cta cta-inline photo-cta" onPick={(file) => void pickPhoto(file)}>
                Elegir foto
              </PhotoButton>
            </div>
          </div>
        ) : null}
        {hit ? (
          <>
            <div className="sheet-row">
              <span className="ok-pill"><i />Detección exitosa</span>
              <BinPill label={material.container.toUpperCase()} tone={material.tone} />
            </div>
            <h2>{objectName}</h2>
            {hit.guide ? (
              <div className="guide">
                <p className="prep-label">Qué es</p>
                <p className="guide-text">{hit.guide.meaning}</p>
                <p className="prep-label">Dónde va</p>
                <p className="guide-text">{hit.guide.destination}</p>
                <p className="prep-label">Qué tienes que hacer</p>
                <div className="prep">
                  {(hit.guide.actions.length ? hit.guide.actions : material.steps).map((step) => (
                    <span className="prep-chip" key={step}>
                      <Icon name={stepIcon(step)} size={16} />
                      {step}
                    </span>
                  ))}
                </div>
                {hit.guide.tip ? <p className="guide-tip">{hit.guide.tip}</p> : null}
              </div>
            ) : (
              <>
                <p className="prep-label">Preparación</p>
                <div className="prep">
                  {material.steps.map((step) => (
                    <span className="prep-chip" key={step}>
                      <Icon name={stepIcon(step)} size={16} />
                      {step}
                    </span>
                  ))}
                </div>
              </>
            )}
            {hit.confidence < 0.72 ? <p className="hint">Confianza media. Confirma el material antes de guardarlo.</p> : null}
            {correcting ? (
              <div className="correct-grid">
                {MATERIALS.map((item) => (
                  <button
                    key={item.code}
                    className={item.code === selected ? "correct-chip is-on" : "correct-chip"}
                    onClick={() => {
                      setSelected(item.code);
                      setManual(true);
                    }}
                  >
                    {item.code}
                  </button>
                ))}
              </div>
            ) : null}
            {saveError ? <p className="sheet-error">{saveError}</p> : null}
            <button className="cta" onClick={() => void register()} disabled={busy}>
              {busy ? "Guardando..." : "Registrar en mi Historial (+10 pts)"}
              {!busy ? <Icon name="check" size={18} /> : null}
            </button>
            <button
              className="text-btn"
              onClick={() => {
                setCorrecting((value) => !value);
                if (correcting) setManual(false);
              }}
            >
              {correcting ? "Volver a la detección" : "Corregir material"}
            </button>
            <PhotoButton className="text-btn photo-text" onPick={(file) => void pickPhoto(file)}>
              Elegir otra foto
            </PhotoButton>
          </>
        ) : null}
      </section>

      {settings ? (
        <div className="sheet-modal">
          <div className="sheet-card">
            <header>
              <strong>Análisis</strong>
              <button className="icon-btn" onClick={() => setSettings(false)} aria-label="Cerrar ajustes">
                <Icon name="close" size={18} />
              </button>
            </header>
            <p>La foto se analiza en el servidor con MIRA y el dataset TrashNet. Puedes subir otra imagen cuando quieras.</p>
            <div className="face-row">
              <button className={facing === "environment" ? "is-on" : ""} onClick={() => setFacing("environment")}>Trasera</button>
              <button className={facing === "user" ? "is-on" : ""} onClick={() => setFacing("user")}>Frontal</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PhotoButton({
  children,
  onPick,
  active = false,
  className = "",
}: {
  children: string;
  onPick: (file: File | undefined) => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <label className={`${className} ${active ? "is-on" : ""}`.trim()}>
      <input
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif,.jfif,.avif"
        onClick={(event) => {
          event.currentTarget.value = "";
        }}
        onChange={(event) => {
          onPick(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      {children}
    </label>
  );
}

async function decodeImage(url: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  if (image.decode) {
    await image.decode();
    return image;
  }
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("imagen"));
  });
  return image;
}

async function openCamera(facing: "environment" | "user") {
  const other = facing === "user" ? "environment" : "user";
  const attempts: Array<MediaTrackConstraints | boolean> = [
    { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
    { facingMode: other, width: { ideal: 1280 }, height: { ideal: 720 } },
    { width: { ideal: 1280 }, height: { ideal: 720 } },
    true,
  ];
  let lastError: unknown;
  for (const video of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia({ video, audio: false });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function mediaSize(media: HTMLVideoElement | HTMLImageElement) {
  if (media instanceof HTMLVideoElement) return { w: media.videoWidth || 1, h: media.videoHeight || 1 };
  return { w: media.naturalWidth || 1, h: media.naturalHeight || 1 };
}

function placeBox(box: BBox, media: HTMLVideoElement | HTMLImageElement, view: HTMLElement, mirror: boolean): BBox {
  const size = mediaSize(media);
  const frameW = size.w;
  const frameH = size.h;
  const viewW = view.clientWidth || 1;
  const viewH = view.clientHeight || 1;
  const frameRatio = frameW / frameH;
  const viewRatio = viewW / viewH;
  const displayW = frameRatio > viewRatio ? viewH * frameRatio : viewW;
  const displayH = frameRatio > viewRatio ? viewH : viewW / frameRatio;
  const offsetX = (displayW - viewW) / 2;
  const offsetY = (displayH - viewH) / 2;
  let x = (box.x * displayW - offsetX) / viewW;
  const y = (box.y * displayH - offsetY) / viewH;
  const w = (box.w * displayW) / viewW;
  const h = (box.h * displayH) / viewH;
  if (mirror) x = 1 - x - w;
  return { x, y, w, h };
}
