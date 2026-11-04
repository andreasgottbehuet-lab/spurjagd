export type GameGoal = 'locks' | 'word' | 'cards';
export type StartMode = 'shared' | 'distributed';
export type RouteMode = 'same' | 'varied';
export type FinishMode = 'meeting' | 'start' | 'origin';
export type Location = { id: string; name: string; description: string };
export type TeamDifficulty = 'easy' | 'normal' | 'hard';
export interface TeamProfile { age: string; difficulty: TeamDifficulty }
export interface GameConfig {
  players: number;
  groupSize: number;
  durationMinutes: number;
  age: string;
  locations: Location[];
  goal: GameGoal;
  puzzleMinutes: number;
  walkingMinutes: number;
  startFinishMinutes: number;
  startMode?: StartMode;
  routeMode?: RouteMode;
  finishMode?: FinishMode;
  meetingPoint?: string;
  startPoint?: string;
  stationCodes?: Record<string, string>;
  routeClueModes?: Record<string, 'description' | 'questions' | 'letters' | 'custom'>;
  routeClueTexts?: Record<string, string>;
  /** Future paid option: per-team age and difficulty. Not enabled by default. */
  teamProfiles?: Record<string, TeamProfile>;
}
export interface TeamPlan {
  name: string;
  memberCount: number;
  profile?: TeamProfile;
  stations: Location[];
  finish: string;
}
export interface GamePlan {
  teams: TeamPlan[];
  stopsPerTeam: number;
  estimatedMinutes: number;
  remainderMinutes: number;
  cautions: string[];
}
const COLORS = ['Rot', 'Blau', 'Grün', 'Gelb', 'Orange', 'Lila', 'Türkis', 'Silber', 'Gold', 'Pink'];
function checkInt(value: number, min: number, max: number, description: string) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(description + ': ungültiger Wert');
}
export function teamSizes(players: number, groupSize: number): number[] {
  checkInt(players, 1, 100, 'Teilnehmerzahl');
  checkInt(groupSize, 1, 10, 'Gruppengröße');
  const count = Math.ceil(players / groupSize);
  const base = Math.floor(players / count);
  const extra = players % count;
  return Array.from({length:count},(_,i)=>base+(i<extra?1:0));
}
export function createPlan(config: GameConfig): GamePlan {
  const { players, groupSize, durationMinutes, locations, puzzleMinutes, walkingMinutes, startFinishMinutes } = config;
  const startMode = config.startMode ?? 'distributed';
  const routeMode = config.routeMode ?? 'same';
  const finishMode = config.finishMode ?? 'meeting';
  const meetingPoint = config.meetingPoint?.trim() || 'Treffpunkt';
  const startPoint = config.startPoint?.trim() || meetingPoint;
  if (!['shared','distributed'].includes(startMode) || !['same','varied'].includes(routeMode) || !['meeting','start','origin'].includes(finishMode)) throw new Error('Ungültige Routenoption');
  checkInt(players, 1, 100, 'Teilnehmerzahl');
  checkInt(groupSize, 1, 10, 'Gruppengröße');
  checkInt(durationMinutes, 15, 480, 'Spieldauer');
  checkInt(puzzleMinutes, 1, 60, 'Rätselzeit');
  checkInt(walkingMinutes, 0, 60, 'Gehzeit');
  checkInt(startFinishMinutes, 0, 120, 'Start- und Abschlusszeit');
  if (startFinishMinutes > durationMinutes) throw new Error('Start- und Abschlusszeit überschreitet die Spieldauer');
  if (locations.length < 1 || locations.length > 20) throw new Error('Bitte 1 bis 20 Standorte angeben');
  const places = locations.map(place => ({ ...place, name: place.name.trim(), description: place.description.trim() }));
  if (places.some(place => !place.name)) throw new Error('Jeder Standort benötigt einen Namen');
  if (new Set(places.map(place => place.name.toLocaleLowerCase('de'))).size !== places.length) throw new Error('Standortnamen müssen eindeutig sein');
  if (places.some(place=>place.name.length>80)) throw new Error('Standortnamen dürfen maximal 80 Zeichen enthalten');
  if (new Set(places.map(place => place.id.trim())).size !== places.length || places.some(place=>!place.id.trim())) throw new Error('Stations-IDs müssen eindeutig und ausgefüllt sein');
  const sizes = teamSizes(players,groupSize);
  const teamCount = sizes.length;
  // One travel leg to each station, plus one leg back to the finish.
  // These are manually provided average assumptions, not calculated distances.
  const timeFor = (stops: number) => startFinishMinutes + stops * puzzleMinutes + (stops + 1) * walkingMinutes;
  let stopsPerTeam = 0;
  for (let s = 1; s <= places.length; s++) {
    if (timeFor(s) <= durationMinutes) stopsPerTeam = s;
    else break;
  }
  if (stopsPerTeam === 0) throw new Error('Die Zeit reicht nicht für eine Station. Dauer erhöhen oder Zeitansätze reduzieren.');
  const teams = Array.from({ length: teamCount }, (_, i) => {
    const startIndex = startMode === 'distributed' ? i % places.length : 0;
    // Same route = same clockwise order, starting at the chosen station.
    // Varied route = alternate travel direction; routes are not distance-optimized.
    const direction = routeMode === 'varied' && i % 2 === 1 ? -1 : 1;
    const stations = Array.from({ length: stopsPerTeam }, (_, j) =>
      ({...places[(startIndex + direction * j + places.length * j) % places.length]}));
    return {
      name: COLORS[i] ?? String(i + 1),
      memberCount: sizes[i],
      ...(config.teamProfiles?.[String(i)] ? {profile:{...config.teamProfiles[String(i)]}} : {}),
      stations,
      finish: finishMode === 'start' ? stations[0].name : finishMode === 'origin' ? startPoint : meetingPoint,
    };
  });
  const cautions: string[] = [];
  if (players > 1 && sizes.includes(1)) cautions.push('Mindestens eine Gruppe besteht aus nur einem Kind. Gruppeneinteilung und Aufsicht vor Ort prüfen.');
  // Compare scheduled station slots, assuming all teams start at the same time.
  // This is a warning only; real walking and puzzle times may vary.
  for (let slot = 0; slot < stopsPerTeam; slot++) {
    const visitors = new Map<string, string[]>();
    for (const team of teams) {
      const station = team.stations[slot];
      visitors.set(station.id, [...(visitors.get(station.id) ?? []), team.name]);
    }
    for (const [stationId, groupNames] of visitors) {
      if (groupNames.length < 2) continue;
      const station = places.find(place => place.id === stationId);
      cautions.push('Möglicher Andrang an Station ' + (slot + 1) + ' (' + (station?.name ?? stationId) + '): ' + groupNames.length + ' Teams bei gleichzeitigem Start. Startzeiten oder Stationskapazität prüfen.');
    }
  }
  if (startMode === 'distributed' && teamCount > places.length) cautions.push('Mehr Teams als Standorte: Mehrere Gruppen starten am selben Ort.');
  if (startMode === 'shared') cautions.push('Alle Teams starten an derselben Station. Bei gleichzeitigem Beginn mögliche Wartezeiten einplanen.');
  if (routeMode === 'varied' && places.length < 3) cautions.push('Für unterschiedliche Umlaufrichtungen werden mindestens drei Standorte benötigt.');
  if (routeMode === 'varied' && stopsPerTeam === 1) cautions.push('Bei nur einer Station pro Team entstehen trotz unterschiedlicher Umlaufrichtung keine unterschiedlichen Stationsfolgen.');
  if (finishMode === 'origin' && startMode === 'distributed') cautions.push('Die Teams starten verteilt an Rätselstationen und kehren zum gemeinsamen Startort zurück.');
  if (finishMode === 'start') cautions.push('Jedes Team kehrt zur ersten eigenen Station zurück. Ein gemeinsames Finale ist nicht eingeplant.');
  if (finishMode === 'start' && stopsPerTeam === 1) cautions.push('Bei nur einer Station ist das Ziel identisch mit der einzigen Rätselstation. Für einen echten Rückweg ein anderes Ziel wählen oder mehr Stationen einplanen.');
  if (stopsPerTeam < places.length) cautions.push('Zeitbudget: Nicht alle Standorte werden pro Team besucht.');
  cautions.push('Gehzeiten und Aufenthaltszeiten sind Schätzwerte. Wege, Querungen, Zugänglichkeit und Aufsicht vor Ort prüfen.');
  return {
    teams,
    stopsPerTeam,
    estimatedMinutes: timeFor(stopsPerTeam),
    remainderMinutes: durationMinutes - timeFor(stopsPerTeam),
    cautions,
  };
}
