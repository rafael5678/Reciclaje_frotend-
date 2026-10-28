const LEVELS = [
  { name: "Semilla", emoji: "🌱", from: 0 },
  { name: "Brote", emoji: "🌿", from: 50 },
  { name: "Árbol", emoji: "🌳", from: 150 },
  { name: "Bosque", emoji: "🌲", from: 400 },
  { name: "Guardián del planeta", emoji: "🌎", from: 1000 },
];

export type Level = {
  name: string;
  emoji: string;
  next: { name: string; missing: number } | null;
  progress: number;
};

export function levelFor(points: number): Level {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) if (points >= LEVELS[i].from) index = i;
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  if (!next) return { name: current.name, emoji: current.emoji, next: null, progress: 1 };
  return {
    name: current.name,
    emoji: current.emoji,
    next: { name: next.name, missing: next.from - points },
    progress: (points - current.from) / (next.from - current.from),
  };
}
