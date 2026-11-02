export type GameGoal = 'locks' | 'word' | 'cards';

export interface GameConfig {
  players: number;
  groupSize: number;
  durationMinutes: number;
  age: string;
  locations: string[];
  goal: GameGoal;
}

export interface TeamPlan {
  name: string;
  memberCount: number;
  stations: string[];
}

const COLORS = ['Rot', 'Blau', 'Grün', 'Gelb', 'Orange', 'Lila', 'Türkis', 'Silber', 'Gold', 'Pink'];

export function createPlan(config: GameConfig): TeamPlan[] {
  const { players, groupSize, durationMinutes, locations } = config;
  if (!Number.isInteger(players) || players < 1 || players > 100) throw new Error('Ungültige Teilnehmerzahl');
  if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10) throw new Error('Ungültige Gruppengröße');
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) throw new Error('Ungültige Dauer');
  const places = locations.map(s => s.trim()).filter(Boolean);
  if (places.length === 0) throw new Error('Mindestens ein Standort erforderlich');

  const teamCount = Math.ceil(players / groupSize);
  const base = Math.floor(players / teamCount);
  const extra = players % teamCount;
  // Preliminary estimate: 15 minutes per location; actual routes remain unverified.
  const siteCount = Math.min(places.length, Math.max(1, Math.floor(durationMinutes / 15)));

  return Array.from({ length: teamCount }, (_, i) => ({
    name: COLORS[i] ?? `Team ${i + 1}`,
    memberCount: base + (i < extra ? 1 : 0),
    stations: Array.from({ length: siteCount }, (_, j) => places[(i + j) % places.length]),
  }));
}
