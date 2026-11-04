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

## Weitere Prüffälle zur Freigabe
- Die Browser-Speicherung muss auch dann einen Fehler anzeigen und den bisherigen Projektstand schützen, wenn nach dem Schreiben der Ersatz-Projektliste das Speichern der aktiven Projektkennung fehlschlägt. Der Wiederherstellungsversuch ist im Code vorgesehen, aber bei einem generell defekten Speicher nicht garantiert.
- Jedes Wegrätselblatt muss eine fortlaufende Teilseitennummer besitzen; fehlende Kennungen sind nicht als gültiger Druck zu behandeln. Bestehende Testdaten müssen dieselbe Vorgabe erfüllen.
- Ein nicht sichtbares Druckpaket kann geometrische Nullmaße liefern. Solche Messwerte dürfen nicht als erfolgreicher A5-Überlauftest gewertet werden. Ein echter Browser-Drucktest mit sichtbarer Druckdarstellung bleibt vor Veröffentlichung erforderlich.

## Speichertransaktionen und Stationskennungen – Prüfstand 04.11.2026
- Speichern, Löschen und Ersetzen des letzten Projekts verwenden denselben lokalen Schreibpfad. Scheitert nach dem Schreiben der Projektliste die Aktualisierung der aktiven Projektkennung, wird die vorherige Liste wiederherzustellen versucht. Bei einer vollständig ausgefallenen Browser-Speicherung ist die Wiederherstellung nicht garantiert; entsprechende Fehler müssen sichtbar bleiben.
- Das Löschen einer nicht vorhandenen Projektkennung wird abgelehnt statt unbemerkt als erfolgreicher Löschvorgang gemeldet.
- Die Stations-ID-Vergabe lehnt ungültige Startwerte (NaN, unendliche Werte, Bruchzahlen und Werte außerhalb des zulässigen Bereichs) ab. Damit kann aus fehlerhaften Startwerten keine endlose Vergabeschleife entstehen.
- GitHub-Statusabfragen für den vorherigen Commit lieferten weder Commit-Statusmeldungen noch Pull-Request-Workflowläufe. Dies belegt weder erfolgreiche noch fehlgeschlagene Push-Workflows. Ein tatsächlich ausgeführter Test- und Buildlauf ist weiterhin offen.

## CI-Prüfablauf (04.11.2026)
Die GitHub-Actions-Qualitätsprüfung installiert die im Lockfile festgelegten Abhängigkeiten mit `npm ci`, führt einen separaten A5-Regressionslauf, die gesamte Testsuite und anschließend den TypeScript-/Produktions-Build aus. Die Protokolle werden als Workflow-Artefakt gespeichert (`a5-print-tests.log`, `tests.log`, `build.log`). Diese Festlegung ist keine Bestätigung, dass der Workflow bereits erfolgreich gelaufen ist. Vor Freigabe sind die tatsächlichen GitHub-Actions-Ergebnisse und ein Browser-Probedruck mit A5-Hochformat zu prüfen.

## CI-Fehleranalyse am 04.11.2026
GitHub Actions Push-Lauf `41770989304` (Commit `f2ece4f`) wurde tatsächlich ausgewertet: Die Installation und der separate A5-Testlauf waren erfolgreich; in der Gesamtsuite bestanden 188 von 189 Tests. Ein Test schlug fehl, weil `npm install` während des Workflows eine unversionierte `package-lock.json` erzeugte und der Test deren bloße Existenz fälschlich als Hinweis auf ein versioniertes Lockfile auswertete. Der Test wurde auf die tatsächliche CI-Installationsstrategie korrigiert. Der Build wurde in diesem Lauf wegen des Testfehlers übersprungen; nachfolgende Workflows sollen den Build auch bei fehlgeschlagenen Tests separat ausführen. Ein versioniertes Lockfile fehlt weiterhin; die Installation ist daher noch nicht reproduzierbar. Die neuen Workflowergebnisse sind separat zu kontrollieren.

## CI-Ergebnis und nächste Abnahme – 04.11.2026
Der GitHub-Actions-Lauf `41771130495` für Commit `f2cb919` wurde mit `success` abgeschlossen (separater A5-Test, gesamte Testsuite und Produktions-Build). Der aktuelle Entwicklungsblock ergänzt die atomare Auswahl des verbleibenden aktiven Projekts beim Löschen; für diese Änderungen muss der jeweilige neue Workflowlauf ebenfalls erfolgreich sein. Da die versionierte `package-lock.json` noch fehlt, legt der Workflow nach `npm install` eine Kopie der erzeugten Lockdatei und eine Liste der installierten direkten Abhängigkeiten als Prüfartefakt ab. Die Kopie ist **kein** Ersatz für ein eingechecktes und geprüftes Lockfile. Ein visueller A5-Browserdruck bleibt offen.
