/** Aufgabenmodus je Station: einzeln, Gruppe oder automatisch abwechselnd (Voreinstellung). */
export type StationMode = 'auto' | 'single' | 'group';
export const STATION_MODES: readonly StationMode[] = ['auto', 'single', 'group'];
export function isStationMode(value: unknown): value is StationMode {
  return typeof value === 'string' && (STATION_MODES as readonly string[]).includes(value);
}
/** Automatisch: 1., 3., 5. ... Station des Teams = Einzelaufgabe, 2., 4. ... = Gruppenaufgabe. */
export function resolveStationMode(mode: StationMode | undefined, stationIndex: number): 'single' | 'group' {
  if (mode === 'single' || mode === 'group') return mode;
  return stationIndex % 2 === 0 ? 'single' : 'group';
}
/** Hinweiszeile fuer Aufgabenblatt und Spielleitung; aendert keinen Raetselinhalt. */
export function stationModeLine(mode: StationMode | undefined, stationIndex: number): string {
  return resolveStationMode(mode, stationIndex) === 'single'
    ? 'Einzelaufgabe – ein Kind löst allein. Wer löst? Reihum'
    : 'Gruppenaufgabe – alle arbeiten zusammen.';
}
