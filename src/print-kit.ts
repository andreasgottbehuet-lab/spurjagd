import type { GamePlan, Location } from './generator';
import { codeFromPuzzles, generateStationChallenge, validCode, type AgeLevel, type Puzzle } from './puzzles.ts';

export interface RouteClue {
  to: string;
  text: string;
}

export type RouteClues = Record<string, RouteClue>;
export type DestinationClues = Record<string, string>;
export type ChildPuzzle = Pick<Puzzle, 'instruction' | 'question' | 'render'>;
export type ChildCard =
  | { kind: 'puzzle'; team: string; station: string; order: number; puzzles: ChildPuzzle[] }
  | { kind: 'clue'; team: string; station: string; order: number; text: string; isFinal: boolean };
export interface LeaderRow {
  team: string;
  station: string;
  order: number;
  code: string;
  solutions: string[];
  next: string;
  clue: string;
}
export interface PrintKit {
  cards: ChildCard[];
  leaderRows: LeaderRow[];
  issues: string[];
  sheetCount: number;
}

export function routeClueKey(teamIndex: number, stopIndex: number): string {
  return teamIndex + ':' + stopIndex;
}

export function expectedClueTarget(stations: Location[], stopIndex: number, finish: string): string {
  return stations[stopIndex + 1]?.id ?? '@finish:' + finish;
}

export function destinationClueKey(stations: Location[], stopIndex: number, finish: string): string {
  const next = stations[stopIndex + 1];
  return next ? 'station:' + next.id : 'finish:' + finish;
}

export function clueDestinations(plan: GamePlan) {
  const destinations = new Map<string, { key: string; name: string; isFinal: boolean; visits: number }>();
  for (const team of plan.teams) {
    team.stations.forEach((_, stopIndex) => {
      const key = destinationClueKey(team.stations, stopIndex, team.finish);
      const existing = destinations.get(key);
      if (existing) existing.visits++;
      else destinations.set(key, {
        key, name: team.stations[stopIndex + 1]?.name ?? team.finish,
        isFinal: stopIndex === team.stations.length - 1, visits: 1,
      });
    });
  }
  return [...destinations.values()].sort((a, b) => Number(a.isFinal) - Number(b.isFinal));
}

/** Keep secret clues on different physical sheets, including an odd final card. */
export function createChildSheets(cards: readonly ChildCard[]): ChildCard[][] {
  const sheets: ChildCard[][] = [];
  for (const kind of ['puzzle', 'clue'] as const) {
    const section = cards.filter(card => card.kind === kind);
    for (let i = 0; i < section.length; i += 2) sheets.push(section.slice(i, i + 2));
  }
  return sheets;
}

function namesTarget(text: string, target: string): boolean {
  const name = target.trim().normalize('NFC');
  if (name.length <= 2) return false;
  const escaped = name.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^\\p{L}\\p{N}\\p{M}])' + escaped + '($|[^\\p{L}\\p{N}\\p{M}])', 'iu')
    .test(text.normalize('NFC'));
}

export function createPrintKit(
  plan: GamePlan,
  codes: Readonly<Record<string, string>>,
  clues: Readonly<RouteClues>,
  age: AgeLevel,
  seed: number,
  destinationClues: Readonly<DestinationClues> = {},
): PrintKit {
  const issues: string[] = [];
  const cards: ChildCard[] = [];
  const leaderRows: LeaderRow[] = [];
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) issues.push('Ungültiger Rätsel-Seed.');
  if (plan.teams.length === 0) issues.push('Keine Teams geplant.');
  for (const [teamIndex, team] of plan.teams.entries()) {
    if (team.stations.length === 0) issues.push(team.name + ': keine Station.');
    for (const [stopIndex, station] of team.stations.entries()) {
      const label = team.name + ', Station ' + (stopIndex + 1) + ' (' + station.name + ')';
      const code = codes[station.id] ?? '';
      if (!validCode(code, code.length)) {
        issues.push(label + ': vollständigen drei- oder vierstelligen Schloss-Code eingeben.');
        continue;
      }
      const next = team.stations[stopIndex + 1]?.name ?? team.finish;
      const expectedTarget = expectedClueTarget(team.stations, stopIndex, team.finish);
      const routeKey = routeClueKey(teamIndex, stopIndex);
      const hasOverride = Object.hasOwn(clues, routeKey);
      const clue = hasOverride ? clues[routeKey] : {
        to: expectedTarget,
        text: destinationClues[destinationClueKey(team.stations, stopIndex, team.finish)] ?? '',
      };
      const clueLabel = hasOverride ? label : 'Gemeinsamer Hinweis ' +
        (stopIndex === team.stations.length - 1 ? 'zum Finale ' : 'zu ') + next;
      if (!clue || clue.to !== expectedTarget || !clue.text.trim()) {
        issues.push(clueLabel + ': passender Hinweis zum nächsten Ort oder Finale fehlt.');
        continue;
      }
      const clueText = clue.text.trim();
      if (clueText.length > 240) {
        issues.push(clueLabel + ': Hinweis überschreitet 240 Zeichen.');
        continue;
      }
      if (namesTarget(clueText, next)) {
        issues.push(clueLabel + ': Hinweis nennt den nächsten Ort direkt. Bitte als Rätsel umformulieren.');
        continue;
      }
      try {
        const challenge = generateStationChallenge(station.id, code, age, seed);
        if (codeFromPuzzles(challenge) !== code || challenge.puzzles.length !== code.length) throw new Error('Rätsel stimmen nicht mit Schloss-Code überein.');
        const childPuzzles = challenge.puzzles.map(({ instruction, question, render }) => ({
          instruction, question, ...(render ? { render: { ...render } } : {}),
        }));
        cards.push({ kind: 'puzzle', team: team.name, station: station.name, order: stopIndex + 1, puzzles: childPuzzles });
        cards.push({ kind: 'clue', team: team.name, station: station.name, order: stopIndex + 1, text: clueText, isFinal: stopIndex === team.stations.length - 1 });
        leaderRows.push({
          team: team.name, station: station.name, order: stopIndex + 1, code,
          solutions: challenge.puzzles.map(p => p.explanation), next, clue: clueText,
        });
      } catch {
        issues.push(label + ': Rätsel konnten nicht konsistent erzeugt werden.');
      }
    }
  }
  // Never print an incomplete packet. All cards remain in memory until preflight is clean.
  return { cards: issues.length === 0 ? cards : [], leaderRows: issues.length === 0 ? leaderRows : [], issues: [...new Set(issues)], sheetCount: issues.length === 0 ? createChildSheets(cards).length : 0 };
}
