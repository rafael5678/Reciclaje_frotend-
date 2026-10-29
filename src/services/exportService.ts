import type { Impact, Scan } from "../models/types";
import { buildXlsx, download } from "./xlsx";

export function exportExcel(name: string, impact: Impact, scans: Scan[]) {
  const generated = new Date().toLocaleString("es-CO");
  const summary = [
    ["Informe de reciclaje EcoScan", ""],
    ["Usuario", name],
    ["Generado", generated],
    ["Objetos escaneados", impact.total],
    ["Bien separados (%)", impact.wellPercent],
    ["Residuos clasificados (kg)", impact.weightKg],
    ["CO₂ evitado (kg)", impact.co2Kg],
    ["Puntos", impact.points],
    ["Escaneos últimos 7 días", impact.last7],
    ["", ""],
    ["Material", "Cantidad"],
    ...impact.categories.map((item) => [`${item.name} (${item.percent}%)`, item.count]),
  ];
  const history = [
    ["Fecha", "Objeto", "Código", "Material", "Contenedor", "Qué hacer", "Certeza (%)", "Bien separado", "Puntos", "Peso (kg)", "CO₂ evitado (kg)"],
    ...scans.map((scan) => [
      new Date(scan.createdAt).toLocaleString("es-CO"),
      scan.objectName,
      scan.materialCode,
      scan.category,
      scan.container,
      scan.primaryAction,
      Math.round(scan.confidence * 100),
      scan.separatedWell ? "Sí" : "No",
      scan.points,
      scan.weightKg,
      scan.co2Kg,
    ]),
  ];
  const blob = buildXlsx([
    { name: "Resumen", rows: summary, widths: [30, 34] },
    { name: "Historial", rows: history, widths: [20, 28, 9, 16, 14, 26, 12, 14, 9, 11, 16] },
  ]);
  download(blob, `ecoscan-historial-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
