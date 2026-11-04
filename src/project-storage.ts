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
/** Only project-list changes invalidate an open editor; active-tab selection alone does not. */
export function projectListChanged(key:string|null):boolean {
  return key===KEY || key===null;
}


export function isGameConfig(data: unknown): data is GameConfig {
  if (!data || typeof data !== 'object') return false;
  const p = data as Record<string, unknown>;
  const integer = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
  if (!integer(p.players, 1, 100) || !integer(p.groupSize, 1, 10) || !integer(p.durationMinutes, 15, 480)) return false;
  if (!text(p.age, 24) || !(p.age as string).trim() || !['locks', 'word', 'cards'].includes(String(p.goal))) return false;
  if (!integer(p.puzzleMinutes, 1, 60) || !integer(p.walkingMinutes, 0, 60) || !integer(p.startFinishMinutes, 0, 120)) return false;
  if (!['shared', 'distributed'].includes(String(p.startMode)) || !['same', 'varied'].includes(String(p.routeMode)) || !['meeting', 'start', 'origin'].includes(String(p.finishMode)) || !text(p.meetingPoint, 80)) return false;
  if (p.startPoint !== undefined && !text(p.startPoint, 80)) return false;
  if (p.teamProfiles !== undefined) {
    if (!p.teamProfiles || typeof p.teamProfiles !== 'object' || Array.isArray(p.teamProfiles)) return false;
    const profiles=Object.entries(p.teamProfiles as Record<string,unknown>);
    if (profiles.length>100 || profiles.some(([key,value])=>!/^[0-9]{1,2}$/.test(key) || Number(key)>99 || !value || typeof value!=='object' || Array.isArray(value) || !text((value as Record<string,unknown>).age,24) || !(String((value as Record<string,unknown>).age).trim()) || !['easy','normal','hard'].includes(String((value as Record<string,unknown>).difficulty)))) return false;
  }
  if (p.stationCodes !== undefined) {
    if (!p.stationCodes || typeof p.stationCodes !== 'object' || Array.isArray(p.stationCodes)) return false;
    const codes = Object.entries(p.stationCodes as Record<string, unknown>);
    if (codes.length > 20 || codes.some(([key, value]) => key.length > 80 || typeof value !== 'string' || !/^[0-9]{0,3}$/.test(value))) return false;
  }
  for (const field of ['routeClueModes','routeClueTexts']) {
    const value=p[field];
    if(value===undefined) continue;
    if(!value || typeof value!=='object' || Array.isArray(value)) return false;
    const entries=Object.entries(value as Record<string,unknown>);
    if(entries.length>25 || entries.some(([key,v])=>key.length>80 || typeof v!=='string' || (field==='routeClueModes'?!['description','questions','letters','custom'].includes(v):v.length>1500))) return false;
  }
  if (!Array.isArray(p.locations) || p.locations.length < 1 || p.locations.length > 20) return false;
  const places = p.locations as unknown[];
  if (!places.every((row: unknown) => {
    if (!row || typeof row !== 'object') return false;
    const r = row as Record<string, unknown>;
    return text(r.id, 80) && Boolean((r.id as string).trim()) && text(r.name, 80) && text(r.description, 400);
  })) return false;
  const locations = places as Location[];
  return new Set(locations.map(x => x.id)).size === locations.length
    && new Set(locations.filter(x=>x.name.trim()).map(x => x.name.trim().toLocaleLowerCase('de'))).size === locations.filter(x=>x.name.trim()).length;
}
export function isSavedGame(raw: unknown): raw is SavedGame {
  if (!raw || typeof raw !== 'object') return false;
  const p = raw as Record<string, unknown>;
  return p.version === 1 && typeof p.id === 'string' && p.id.length > 0 && p.id.length <= 100
    && typeof p.title === 'string' && p.title.trim().length > 0 && p.title.length <= 100
    && typeof p.updatedAt === 'string' && !Number.isNaN(Date.parse(p.updatedAt)) && isGameConfig(p.config);
}
export function parseGameBackup(raw: string): SavedGame {
  if (new TextEncoder().encode(raw).byteLength > MAX_FILE_BYTES) throw new Error('Die Sicherungsdatei ist zu groß.');
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new Error('Sicherungsdatei ist kein gültiges JSON.'); }
  if (!value || typeof value !== 'object' || (value as Record<string, unknown>).format !== 'spurjagd-backup-1') throw new Error('Kein Spurjagd-Backup.');
  const game = (value as { project?: unknown }).project;
  if (!isSavedGame(game)) throw new Error('Ungültige oder nicht unterstützte Projektdaten.');
  return game;
}
export function serializeGameBackup(project: SavedGame): string {
  if (!isSavedGame(project)) throw new Error('Das Projekt enthält ungültige Daten.');
  const serialized=JSON.stringify({ format: 'spurjagd-backup-1', project }, null, 2);
  if (new TextEncoder().encode(serialized).byteLength > MAX_FILE_BYTES) throw new Error('Die Sicherungsdatei ist zu groß.');
  return serialized;
}
export function loadGames(): SavedGame[] {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return [];
  if (raw === '') throw new Error('Lokale Projektdaten sind leer oder beschädigt.');
  let items: unknown;
  try { items = JSON.parse(raw); }
  catch { throw new Error('Lokale Projektdaten enthalten ungültiges JSON. Bitte eine Sicherung importieren.'); }
  if (!Array.isArray(items) || items.length > MAX_PROJECTS || !items.every(isSavedGame)) throw new Error('Lokale Projektdaten sind beschädigt. Bitte eine Sicherung importieren.');
  const projects=items as SavedGame[];
  if(new Set(projects.map(project=>project.id)).size!==projects.length) throw new Error('Lokale Projektdaten enthalten doppelte Projektkennungen. Bitte eine Sicherung importieren.');
  return [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
/** Writes project list and active selection together, restoring both on a partial failure. */
function persistProjects(next:SavedGame[],active:string|null):void {
 const oldList=localStorage.getItem(KEY);
 const oldActive=localStorage.getItem(ACTIVE);
 try{
  localStorage.setItem(KEY,JSON.stringify(next));
  if(active===null)localStorage.removeItem(ACTIVE);
  else localStorage.setItem(ACTIVE,active);
 }catch(error){
  try{
   if(localStorage.getItem(KEY)!==oldList){
    if(oldList===null)localStorage.removeItem(KEY);
    else localStorage.setItem(KEY,oldList);
   }
   if(localStorage.getItem(ACTIVE)!==oldActive){
    if(oldActive===null)localStorage.removeItem(ACTIVE);
    else localStorage.setItem(ACTIVE,oldActive);
   }
  }catch{
   throw new Error('Speichern fehlgeschlagen; Wiederherstellung der Projektdaten ist nicht bestätigt.');
  }
  throw error;
 }
}
export function saveGame(project: SavedGame): SavedGame[] {
 if(!isSavedGame(project))throw new Error('Projekt ungültig.');
 const existing=loadGames();
 const next=[project,...existing.filter(p=>p.id!==project.id)];
 if(next.length>MAX_PROJECTS)throw new Error('Maximal 40 Projekte. Bitte alte Projekte löschen.');
 persistProjects(next,project.id);
 return next;
}
export function deleteGame(id:string):SavedGame[] {
 const existing=loadGames();
 const remaining=existing.filter(p=>p.id!==id);
 if(remaining.length===existing.length)throw new Error('Projekt nicht gefunden.');
 const active=localStorage.getItem(ACTIVE);
 const nextActive=active===id ? (remaining[0]?.id??null) : active;
 persistProjects(remaining,nextActive);
 return remaining;
}
/** Replace the final saved project without ever writing an empty project list. */
export function replaceLastGame(oldId:string,replacement:SavedGame):SavedGame[] {
 if(!isSavedGame(replacement)||replacement.id===oldId) throw new Error('Ersatzprojekt ungültig.');
 const existing=loadGames();
 if(existing.length!==1||existing[0].id!==oldId) throw new Error('Das Projekt ist nicht das letzte gespeicherte Projekt.');
 persistProjects([replacement],replacement.id);
 return [replacement];
}
export function activeGameId(): string | null { return localStorage.getItem(ACTIVE); }
export function setActiveGameId(id: string): void {
  if(!loadGames().some(project=>project.id===id)) throw new Error('Aktives Projekt existiert nicht.');
  localStorage.setItem(ACTIVE, id);
}
export function newGameId(): string { return crypto.randomUUID(); }
/** Preserve the import suffix while respecting the 100-character project-title limit. */
export function importedProjectTitle(title:string):string {
  const suffix=' (Import)';
  return title.slice(0,100-suffix.length).trimEnd()+suffix;
}
export function backupFilename(project: Pick<SavedGame, 'title' | 'id'>): string {
  const title = project.title.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'projekt';
  const id = project.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || 'sicherung';
  return 'spurjagd-' + title + '-' + id + '.json';
}
export function downloadBackup(project: SavedGame): void {
  const blob = new Blob([serializeGameBackup(project)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFilename(project);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
