import { useEffect, useState } from "react";
import { BinPill } from "../components/Charts";
import { Icon, stepIcon } from "../components/Icons";
import type { Material } from "../models/types";
import { materialService } from "../services/materialService";

export function GuideView({ variant = "phone" }: { variant?: "phone" | "panel" }) {
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    let alive = true;
    materialService.list().then((items) => {
      if (alive) setMaterials(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={variant === "panel" ? "guide guide-panel" : "guide"}>
      <header className="guide-head">
        <p className="kicker">Guía de materiales</p>
        <h1>Dónde va cada residuo</h1>
        <p>Un envase en el contenedor equivocado puede contaminar todo el lote. El color de la caneca cambia según la ciudad; aquí usamos el código más común.</p>
      </header>
      <div className="guide-grid">
        {materials.map((material) => (
          <article className={`material-card tone-${material.tone}`} key={material.code}>
            <header>
              <span className="code-badge" style={{ color: material.accent, background: `${material.accent}22` }}>{material.code}</span>
              <div>
                <h2>{material.name}</h2>
                <p>{material.fullName}</p>
              </div>
              <BinPill label={material.container} tone={material.tone} />
            </header>
            <p>{material.blurb}</p>
            <p className="where-line">{material.containerDetail}</p>
            <div className="prep">
              {material.steps.map((step) => (
                <span className="prep-chip" key={step}>
                  <Icon name={stepIcon(step)} size={15} />
                  {step}
                </span>
              ))}
            </div>
            <p className="warning">{material.warning}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
