export type GameGoal = 'locks' | 'word' | 'cards';
export type Location = { id: string; name: string; description: string };
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
}
export interface TeamPlan {
  name: string;
  memberCount: number;
  stations: Location[];
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
export function createPlan(config: GameConfig): GamePlan {
  const { players, groupSize, durationMinutes, locations, puzzleMinutes, walkingMinutes, startFinishMinutes } = config;
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
  const teamCount = Math.ceil(players / groupSize);
  const base = Math.floor(players / teamCount);
  const extra = players % teamCount;
  // One travel leg to each station, plus one leg back to the finish.
  // These are manually provided average assumptions, not calculated distances.
  const timeFor = (stops: number) => startFinishMinutes + stops * puzzleMinutes + (stops + 1) * walkingMinutes;
  let stopsPerTeam = 0;
  for (let s = 1; s <= places.length; s++) {
    if (timeFor(s) <= durationMinutes) stopsPerTeam = s;
    else break;
  }
  if (stopsPerTeam === 0) throw new Error('Die Zeit reicht nicht für eine Station. Dauer erhöhen oder Zeitansätze reduzieren.');
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    name: COLORS[i] ?? 'Team ' + (i + 1),
    memberCount: base + (i < extra ? 1 : 0),
    stations: Array.from({ length: stopsPerTeam }, (_, j) => places[(i + j) % places.length]),
  }));
  const cautions: string[] = [];
  if (teamCount > places.length) cautions.push('Mehr Teams als Standorte: Mehrere Gruppen starten am selben Ort.');
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
