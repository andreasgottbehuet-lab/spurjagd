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
