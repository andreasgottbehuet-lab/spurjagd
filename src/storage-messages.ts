// Englische Fassungen der Fehlermeldungen aus project-storage.ts für die Projekt-/Speicheransicht.
export const STORAGE_ERRORS_EN: Record<string, string> = {
  'Die Sicherungsdatei ist zu groß.':'The backup file is too large.',
  'Sicherungsdatei ist kein gültiges JSON.':'The backup file is not valid JSON.',
  'Kein Spurjagd-Backup.':'Not a Spurjagd backup.',
  'Ungültige oder nicht unterstützte Projektdaten.':'Invalid or unsupported project data.',
  'Das Projekt enthält ungültige Daten.':'The project contains invalid data.',
  'Lokale Projektdaten sind leer oder beschädigt.':'Local project data is empty or damaged.',
  'Lokale Projektdaten enthalten ungültiges JSON. Bitte eine Sicherung importieren.':'Local project data contains invalid JSON. Please import a backup.',
  'Lokale Projektdaten sind beschädigt. Bitte eine Sicherung importieren.':'Local project data is damaged. Please import a backup.',
  'Lokale Projektdaten enthalten doppelte Projektkennungen. Bitte eine Sicherung importieren.':'Local project data contains duplicate project IDs. Please import a backup.',
  'Speichern fehlgeschlagen; Wiederherstellung der Projektdaten ist nicht bestätigt.':'Saving failed; restoring the project data is not confirmed.',
  'Projekt ungültig.':'Invalid project.',
  'Projekt wurde zwischenzeitlich verändert. Bitte die aktuelle Fassung prüfen und eine JSON-Sicherung exportieren.':'The project was changed in the meantime. Please check the current version and export a JSON backup.',
  'Maximal 40 Projekte. Bitte alte Projekte löschen.':'At most 40 projects. Please delete old projects.',
  'Projekt wurde zwischenzeitlich verändert. Löschen abgebrochen.':'The project was changed in the meantime. Delete cancelled.',
  'Projekt nicht gefunden.':'Project not found.',
  'Ersatzprojekt ungültig.':'Invalid replacement project.',
  'Das Projekt ist nicht das letzte gespeicherte Projekt.':'The project is not the last saved project.',
  'Projekt wurde zwischenzeitlich verändert. Ersetzen abgebrochen.':'The project was changed in the meantime. Replace cancelled.',
  'Aktives Projekt existiert nicht.':'The active project does not exist.',
};

/** Text eines Speicherfehlers; im englischen Modus nie mit deutschem Resttext. */
export function storageErrorText(error: unknown, english: boolean): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (!english) return String(error);
  const known = STORAGE_ERRORS_EN[raw.trim()];
  if (known) return known;
  // Nur explizit übersetzte Meldungen weiterreichen; unbekannte Texte könnten deutsch sein.
  return 'Unknown storage error.';
}
