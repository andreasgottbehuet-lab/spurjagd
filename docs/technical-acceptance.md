# Technische Abnahme – SPURJAGD

Status: offen. Die folgenden Schritte sind Prüfanweisungen, keine bestätigten Prüfergebnisse.

## Voraussetzungen
- Node.js 22 oder neuer
- Zugriff auf das private GitHub-Repository
- Browser mit Druckvorschau (A5 Hochformat)

## Automatische Prüfung
Im Repository ausführen:

```bash
npm install --no-audit --no-fund
npm test
npm run build
```

Freigabe nur, wenn beide letzten Befehle mit Exitcode 0 enden. Fehlermeldungen vollständig sichern; nicht nur die Anzahl bestandener Tests notieren.

Alternativ den GitHub-Actions-Workflow **Quality checks** über **Actions → Quality checks → Run workflow** auf dem Branch `main` starten. Der Workflow ist auch für Pushes auf `main` vorgesehen. Ein fehlender Workflow-Status ist kein bestandenes Prüfergebnis.

## Druckprüfung
1. Ein Spiel mit vier Teams, vier Stationen und drei besuchten Stationen je Team anlegen.
2. Schloss-Codes mit führenden Nullen (beispielsweise `007`) verwenden.
3. Ein Ziel im Fragenmodus mit mehr als fünf Lösungsbuchstaben anlegen.
4. A5 Hochformat und tatsächliche Skalierung in der Browser-Druckvorschau kontrollieren.
5. Je Umschlag Aufgabenblatt, Antwortblatt und alle Wegrätselblätter zählen. Team, Stationsnummer und Zielhinweis prüfen.
6. Lösungsschlüssel der Spielleitung und Etiketten gegen die Druckumfangsanzeige abgleichen.
7. Keine ungewollten Leerblätter, abgeschnittenen Fragen oder getrennten Frage-Antwort-Zeilen akzeptieren.
8. Die Route praktisch mit einem Testteam lösen; der Zielort darf auf dem Kinderblatt nicht vorweggenommen werden.

## Abnahmeprotokoll
Datum, Commit-SHA, Node-Version, Browser, Druckeinstellung, Test- und Build-Ergebnis, tatsächliche A5-Seitenzahl sowie festgestellte Abweichungen dokumentieren.

Bis diese Ergebnisse vorliegen, bleibt der Status **nicht abgenommen**.

## Automatisierte Grenzfall-Matrix

Die Testdatei `tests/print-manifest.test.mjs` enthält zusätzlich eine Matrix mit 180 Konfigurationen:
- Teilnehmerzahlen 1, 2, 7, 12, 25 und 100
- Gruppengrößen 1, 3 und 10
- Stationszahlen 1, 2, 4, 8 und 20
- gleiche und wechselnde Routenrichtung

Geprüft werden Umschlaganzahl, Zuordnung, Seitenrechnung und die Konsistenz der Druckprüfung. Ein weiterer Test erzeugt ein 80 Buchstaben langes Fragenrätsel mit 16 A5-Wegrätselseiten und prüft die Lösungsbuchstaben.

**Grenze:** Diese Tests prüfen die Programmlogik, nicht die physischen Seitenumbrüche oder das Erscheinungsbild der Ausdrucke. Die tatsächliche Ausführung der Tests und des Builds ist weiterhin nachzuweisen.

## Erweiterte Druckfreigabeprüfungen
- Die Druckprüfung vergleicht neben den Gruppenstationen auch die berechnete Gesamtdauer und den verbleibenden Zeitpuffer mit dem neu erzeugten Plan. Manipulierte Zeitangaben müssen die Druckfreigabe verhindern.
- Eigene Weghinweise und Beschreibungen dürfen den vollständigen Zielort auch mit zusätzlichen Satzzeichen oder mehrfachen Leerzeichen nicht vorwegnehmen. Ein mehrteiliger Ortsname ist als Negativtest hinterlegt.
- Automatisierte Tests sind im Repository angelegt. Ihre erfolgreiche Ausführung und der reale A5-Ausdruck sind weiterhin separat nachzuweisen.

## Planungshinweise und Druckfreigabe
Für die A5-Abnahme zusätzlich eine Konfiguration mit 60 oder mehr Teams und verteilten Startstationen testen. Sämtliche automatisch erzeugten Hinweise zu möglichem Andrang und Startkonflikten müssen auf eigenen Spielleitungsblättern erscheinen (maximal vier pro Blatt). Die Druckmanifestprüfung muss diese Blätter mitzählen. Werden Warnungen aus einem Plan entfernt oder verändert, muss die Druckfreigabe scheitern. Für den praktischen Ausdruck die tatsächliche Blattzahl und die Lesbarkeit separat dokumentieren.

Die Regressionstests kontrollieren außerdem, dass ein Zielwort wie „Tor“ nicht fälschlich in „Motor“ erkannt wird, während ein tatsächlich genanntes Ziel als verratene Lösung gilt.

## Nachweis der automatischen Prüfung
Der GitHub-Workflow speichert bei jeder Ausführung die geprüfte Commit-SHA, Node- und npm-Version sowie – soweit die jeweiligen Schritte ausgeführt wurden – die vollständigen Ausgaben von `npm test` und `npm run build` als herunterladbares Actions-Artefakt `spurjagd-verification-<run-id>` (30 Tage Aufbewahrung). Bei einem fehlgeschlagenen Installationsschritt können die beiden Logdateien fehlen; das ist **kein** bestandenes Prüfergebnis.

**Abnahmeverfahren:** Im Repository unter **Actions → Quality checks** den neuesten Lauf des freizugebenden Commits öffnen. Nur ein grüner Lauf mit erfolgreich ausgeführten Schritten **Unit and integration tests** und **TypeScript and production build** zählt als technische Freigabe. Die zugehörigen Logdateien herunterladen und den Commit mit dem Abnahmeprotokoll abgleichen. Ein grüner Lauf für einen älteren Commit genügt nicht.

Für Windows kann `scripts/verify-windows.ps1` verwendet werden; das Transcript `spurjagd-verification.log` enthält zusätzlich Node-Version, npm-Version und – bei vorhandenem Git – den Commit. Anschließend weiterhin A5-Druckvorschau und vollständigen Probedruck prüfen.

## Projektverwaltung und Wegrätsel – Regression
Beim Löschen des letzten gespeicherten Projekts muss der Editor mit neutralen Standardstationen, leeren Codes und leeren Wegrätsel- und Gruppenprofil-Einstellungen starten. Die zuvor gelöschte Schnitzeljagd darf nicht durch die automatische Speicherung unter einer neuen Projekt-ID wieder auftauchen. Ein importiertes Teamprofil mit leerer Altersangabe muss abgewiesen werden.

Die Zielortprüfung muss Schreibvarianten mit Bindestrichen, Leerzeichen, zusammengesetzten Ortsnamen und Umlaut-Umschreibung erkennen (z. B. „Feuerwehr-Platz“ bei Ziel „Feuerwehrplatz“), darf aber Teilwörter wie „Tor“ in „Motor“ nicht fälschlich als ausgeschriebenen Zielort werten. Die Tests dafür sind im Repository hinterlegt; ihre erfolgreiche Ausführung bleibt bis zu einem tatsächlichen Testlauf offen.

## Zusätzliche Datenintegrität
Eine fehlende lokale Projektliste ist ein Erststart. Ein vorhandener, aber leerer Speicherwert ist dagegen ein beschädigter Datensatz und darf nicht durch die automatische Speicherung überschrieben werden. Doppelte Projektkennungen sind ungültig. Neue Entwürfe müssen vollständig neutrale Standardwerte erhalten, einschließlich Teilnehmerzahl, Altersangabe, Start- und Treffpunkt sowie leerer Rätsel- und Code-Einstellungen. Für diese Fälle sind automatisierte Regressionstests vorgesehen; eine erfolgreiche Ausführung ist gesondert nachzuweisen.

## Mehrere Tabs und Verlassen der Seite
Wird die lokale Projektliste in einem anderen Browser-Tab geändert, muss der geöffnete Editor einen Konflikthinweis anzeigen und das automatische Speichern sowie Lösch- und Projektwechselaktionen sperren. Damit wird vermieden, dass eine ältere Ansicht den neueren Stand überschreibt. Der Anwender muss den aktuellen Stand in einem Tab sichern und die zweite Ansicht neu laden. Beim Schließen oder Wechseln in den Hintergrund versucht der Editor, offene Eingaben unmittelbar zu speichern, sofern kein Tab-Konflikt oder Speicherfehler vorliegt. Ein Browserabsturz oder blockierter Speicher kann nicht vollständig abgefangen werden; JSON-Backups bleiben notwendig.

## Sicheres Löschen des letzten Projekts
Der letzte gespeicherte Entwurf wird durch einen neutralen Ersatzentwurf in einem einzigen Schreibvorgang auf der Projektliste ersetzt. Schlägt dieser Schreibvorgang fehl, bleibt die bisherige Projektliste unverändert. Ein Projektwechsel, eine Neuanlage und das Löschen sind bei beschädigtem oder nicht verfügbarem Browser-Speicher gesperrt; der JSON-Export des aktuellen Entwurfs bleibt als Rettungsweg vorgesehen. Die zugehörigen Tests decken den erfolgreichen Ersatz, ungültige Kennungen und einen simulierten Schreibfehler ab. Erfolgreiche Testausführung und Browserprüfung sind weiterhin gesondert nachzuweisen.
