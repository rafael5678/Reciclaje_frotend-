import type { Impact, Scan } from "../models/types";
import { api } from "../repositories/http";
import { mapScan, scanRepository } from "../repositories/scanRepository";
import { sessionRepository } from "../repositories/sessionRepository";

type ApiImpact = {
  total: number;
  well_percent: number;
  today: number;
  last7: number;
  previous7: number;
  night: number;
  week_change_percent: number;
  points: number;
  weight_kg: number;
  co2_kg: number;
  weekly: { label: string; count: number; is_today: boolean }[];
  categories: { name: string; count: number; percent: number; color: string }[];
  recent: Record<string, unknown>[];
};

const COLORS = ["#1f9d5a", "#3b82f6", "#65a33a", "#8b949e", "#c4956a", "#5c6764"];

export const impactService = {
  async get(): Promise<Impact> {
    try {
      const token = sessionRepository.token();
      const raw = await api<ApiImpact>("/api/impact", {}, token);
      return {
        total: raw.total,
        wellPercent: raw.well_percent,
        today: raw.today,
        last7: raw.last7,
        previous7: raw.previous7,
        night: raw.night,
        weekChangePercent: raw.week_change_percent,
        points: raw.points,
        weightKg: raw.weight_kg,
        co2Kg: raw.co2_kg,
        weekly: raw.weekly.map((day) => ({ label: day.label, count: day.count, isToday: day.is_today })),
        categories: raw.categories,
        recent: raw.recent.map((scan) => mapScan(scan as Parameters<typeof mapScan>[0])),
      };
    } catch {
      return fromScans(scanRepository.localScans());
    }
  },
};

function fromScans(scans: Scan[]): Impact {
  const total = scans.length;
  const well = scans.filter((scan) => scan.separatedWell).length;
  const categories = groupCategories(scans, total);
  return {
    total,
    wellPercent: total ? Math.round((100 * well) / total) : 0,
    today: scans.filter((scan) => sameDay(scan.createdAt, 0)).length,
    last7: scans.filter((scan) => withinDays(scan.createdAt, 0, 7)).length,
    previous7: scans.filter((scan) => withinDays(scan.createdAt, 7, 14)).length,
    night: scans.filter((scan) => withinDays(scan.createdAt, 0, 7) && isNight(scan.createdAt)).length,
    weekChangePercent: 0,
    points: scans.reduce((sum, scan) => sum + scan.points, 0),
    weightKg: round1(scans.reduce((sum, scan) => sum + scan.weightKg, 0)),
    co2Kg: round1(scans.reduce((sum, scan) => sum + scan.co2Kg, 0)),
    weekly: weekSeries(scans),
    categories,
    recent: scans.slice(0, 8),
  };
}

function groupCategories(scans: Scan[], total: number): Impact["categories"] {
  const names = ["Plástico", "Papel y cartón", "Vidrio", "Metal", "Orgánico", "General"];
  return names.map((name, index) => {
    const count = scans.filter((scan) => scan.category === name).length;
    return {
      name,
      count,
      percent: total ? Math.round((100 * count) / total) : 0,
      color: COLORS[index],
    };
  });
}

function weekSeries(scans: Scan[]): Impact["weekly"] {
  const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const series: Impact["weekly"] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const label = offset === 0 ? "Hoy" : `${days[date.getDay()]} ${date.getDate()}`;
    series.push({
      label,
      count: scans.filter((scan) => sameDay(scan.createdAt, offset)).length,
      isToday: offset === 0,
    });
  }
  return series;
}

function sameDay(iso: string, daysAgo: number): boolean {
  const date = new Date(iso);
  const target = new Date();
  target.setDate(target.getDate() - daysAgo);
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth() && date.getDate() === target.getDate();
}

function withinDays(iso: string, from: number, to: number): boolean {
  const date = start(new Date(iso)).getTime();
  const today = start(new Date()).getTime();
  const diff = Math.round((today - date) / 86_400_000);
  return diff >= from && diff < to;
}

function isNight(iso: string): boolean {
  const hour = new Date(iso).getHours();
  return hour >= 19 || hour < 6;
}

function start(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
