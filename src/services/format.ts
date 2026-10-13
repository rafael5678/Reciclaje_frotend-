export function formatConfidence(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatKg(value: number): string {
  return `${value.toFixed(1)} kg`;
}

export function formatPoints(value: number): string {
  return value.toLocaleString("es-CO");
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "E";
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
  const today = startOfDay(new Date());
  const that = startOfDay(date);
  const diff = Math.round((today.getTime() - that.getTime()) / 86_400_000);
  if (diff === 0) return `Hoy ${time}`;
  if (diff === 1) return `Ayer ${time}`;
  const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  return `${days[date.getDay()]} ${date.getDate()} · ${time}`;
}

export function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

export function signedPercent(value: number): string {
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
