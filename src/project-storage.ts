import type { GameConfig, Location } from './generator';

export interface SavedGame {
  version: 1;
  id: string;
  title: string;
  updatedAt: string;
  config: GameConfig;
}
const KEY = 'spurjagd-projects-v1';
const ACTIVE = 'spurjagd-active-project-v1';
const MAX_PROJECTS = 40;
const MAX_FILE_BYTES = 200_000;

export function isGameConfig(data: unknown): data is GameConfig {
  if (!data || typeof data !== 'object') return false;
  const p = data as Record<string, unknown>;
  const integer = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
  if (!integer(p.players, 1, 100) || !integer(p.groupSize, 1, 10) || !integer(p.durationMinutes, 15, 480)) return false;
  if (!text(p.age, 24) || !['locks', 'word', 'cards'].includes(String(p.goal))) return false;
  if (!integer(p.puzzleMinutes, 1, 60) || !integer(p.walkingMinutes, 0, 60) || !integer(p.startFinishMinutes, 0, 120)) return false;
  if (!['shared', 'distributed'].includes(String(p.startMode)) || !['same', 'varied'].includes(String(p.routeMode)) || !['meeting', 'start', 'origin'].includes(String(p.finishMode)) || !text(p.meetingPoint, 80)) return false;
  if (p.startPoint !== undefined && !text(p.startPoint, 80)) return false;
  if (p.stationCodes !== undefined) {
    if (!p.stationCodes || typeof p.stationCodes !== 'object' || Array.isArray(p.stationCodes)) return false;
    const codes = Object.entries(p.stationCodes as Record<string, unknown>);
    if (codes.length > 20 || codes.some(([key, value]) => key.length > 80 || typeof value !== 'string' || !/^[0-9]{0,3}$/.test(value))) return false;
  }
  if (!Array.isArray(p.locations) || p.locations.length < 1 || p.locations.length > 20) return false;
  const places = p.locations as unknown[];
  if (!places.every((row: unknown) => {
    if (!row || typeof row !== 'object') return false;
    const r = row as Record<string, unknown>;
    return text(r.id, 80) && Boolean(r.id) && text(r.name, 80) && Boolean(String(r.name).trim()) && text(r.description, 400);
  })) return false;
  const locations = places as Location[];
  return new Set(locations.map(x => x.id)).size === locations.length
    && new Set(locations.map(x => x.name.trim().toLowerCase())).size === locations.length;
}
export function isSavedGame(raw: unknown): raw is SavedGame {
  if (!raw || typeof raw !== 'object') return false;
  const p = raw as Record<string, unknown>;
  return p.version === 1 && typeof p.id === 'string' && p.id.length > 0 && p.id.length <= 100
    && typeof p.title === 'string' && p.title.trim().length > 0 && p.title.length <= 100
    && typeof p.updatedAt === 'string' && !Number.isNaN(Date.parse(p.updatedAt)) && isGameConfig(p.config);
}
export function parseGameBackup(raw: string): SavedGame {
  if (raw.length > MAX_FILE_BYTES) throw new Error('Die Sicherungsdatei ist zu groß.');
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || (value as Record<string, unknown>).format !== 'spurjagd-backup-1') throw new Error('Kein Spurjagd-Backup.');
  const game = (value as { project?: unknown }).project;
  if (!isSavedGame(game)) throw new Error('Ungültige oder nicht unterstützte Projektdaten.');
  return game;
}
export function serializeGameBackup(project: SavedGame): string {
  if (!isSavedGame(project)) throw new Error('Das Projekt enthält ungültige Daten.');
  return JSON.stringify({ format: 'spurjagd-backup-1', project }, null, 2);
}
export function loadGames(): SavedGame[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const items: unknown = JSON.parse(raw);
  if (!Array.isArray(items) || items.length > MAX_PROJECTS || !items.every(isSavedGame)) throw new Error('Lokale Projektdaten sind beschädigt. Bitte eine Sicherung importieren.');
  return (items as SavedGame[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function saveGame(project: SavedGame): SavedGame[] {
  if (!isSavedGame(project)) throw new Error('Projekt ungültig.');
  const existing = loadGames();
  const next = [project, ...existing.filter(p => p.id !== project.id)];
  if (next.length > MAX_PROJECTS) throw new Error('Maximal 40 Projekte. Bitte alte Projekte löschen.');
  localStorage.setItem(KEY, JSON.stringify(next));
  localStorage.setItem(ACTIVE, project.id);
  return next;
}
export function deleteGame(id: string): SavedGame[] {
  const remaining = loadGames().filter(p => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(remaining));
  if (localStorage.getItem(ACTIVE) === id) localStorage.removeItem(ACTIVE);
  return remaining;
}
export function activeGameId(): string | null { return localStorage.getItem(ACTIVE); }
export function setActiveGameId(id: string): void { localStorage.setItem(ACTIVE, id); }
export function newGameId(): string { return crypto.randomUUID(); }
export function downloadBackup(project: SavedGame): void {
  const blob = new Blob([serializeGameBackup(project)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'spurjagd-' + project.id.slice(0, 8) + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
