# SPURJAGD – A5-Abnahmeprotokoll (Vorlage)

**Status:** Automatische A5-Prüfung bestanden; physischer Probedruck und praktische Abnahme offen. Dieses Dokument bestätigt keinen vor Ort durchgeführten Probedruck.

## Verifizierter technischer Stand (04.11.2026)

- Branch: `feature/print-preflight-hardening-20261104`
- Geprüfter Commit: `ff81eec53e0654edadd05af08e970b4964de501f`
- GitHub Actions: [Quality checks #1235](https://github.com/andreasgottbehuet-lab/spurjagd/actions/runs/41888630316) – **success**
- Automatische Tests: **329 bestehende Tests plus zusätzlicher 100-Fälle-Stresstest; Gesamtprüfung erfolgreich**
- Chromium-PDF-Probedruck: **53 A5-Seiten**, automatische PDF-Prüfung bestanden
- [Prüfartefakt mit PDF und Browser-Nachweisen](https://github.com/andreasgottbehuet-lab/spurjagd/actions/runs/41888630316/artifacts/13351713697)
- Neu geprüft: gemeinsames Drei-Zahlwörter-Gitter mit eindeutigem Code von oben nach unten; rote und blaue Teamkennzeichnung; Antwortblatt und Spielleiterlösung
- **Nicht nachgewiesen:** physischer Druck, echte Schlossmechanik, Lesbarkeit auf konkretem Drucker, praktische Verständlichkeit mit Kindern.


## Prüfumgebung (vor Ort ausfüllen)

- Datum / Prüfer: __________________________
- Browser / Version: ______________________
- Drucker / Treiber: _______________________
- Papier: A5, 148 × 210 mm; Ausrichtung Hochformat
- Druckeinstellung: 100 % / tatsächliche Größe; kein „An Seite anpassen“
- Testfall: 12 Kinder, vier Dreiergruppen, vier Stationen, zwölf dreistellige Schlösser
- Codes des Referenzfalls: 007 / 000 / 123 / 987
- Automatischer CI-Lauf / Commit: #1235 / `ff81eec` (technisch bestanden)

## Abnahmekriterien

| Nr. | Prüfschritt | Sollzustand | Ergebnis |
|---|---|---|---|
| 1 | PDF-Eigenschaften öffnen | Alle Seiten A5 Hochformat (148 × 210 mm) | ☐ OK ☐ Fehler |
| 2 | Gesamtes PDF prüfen | Referenzfall: 53 A5-Seiten; keine Leerseiten | ☐ OK ☐ Fehler |
| 3 | Erste und letzte Seite drucken | Keine abgeschnittenen Texte, Linien oder Ränder | ☐ OK ☐ Fehler |
| 4 | Kinderblätter vollständig drucken | Jede Aufgabe lesbar; ausreichend Platz zum Schreiben; Drei-Zahlwörter-Gitter mit Reihenfolge verständlich | ☐ OK ☐ Fehler |
| 5 | Organisatorblätter prüfen | Lösungen, Zuordnung, Routen und Packliste vollständig | ☐ OK ☐ Fehler |
| 6 | Umschlagetiketten ausschneiden | Gruppen-/Stationskennung, Teamfarbe und Blattanzahl eindeutig | ☐ OK ☐ Fehler |
| 7 | Zwölf Umschläge packen | Jedes Kind erhält die vorgesehene Blattfolge | ☐ OK ☐ Fehler |
| 8 | Zwölf reale Schlösser einstellen | Alle Codes dreistellig; führende Nullen funktionieren | ☐ OK ☐ Fehler |
| 9 | Laufweg der Gruppen vergleichen | Unterschiedliche Routen stimmen mit Spielleiterübersicht überein | ☐ OK ☐ Fehler |
| 10 | Ungültigen Code im Editor eingeben | Druck gesperrt; nach Korrektur wieder freigegeben | ☐ OK ☐ Fehler |
| 11 | Notfallsicherung exportieren/importieren | Titel, Stationen, Codes und Gruppeneinteilung unverändert | ☐ OK ☐ Fehler |
| 12 | Kinder-Probelauf | Aufgaben verständlich, Zeit und Laufwege praktikabel | ☐ OK ☐ Fehler |

## Festgestellte Mängel

| Nr. | Seite / Umschlag / Station | Befund | Maßnahme | Nachprüfung |
|---|---|---|---|---|
| | | | | |

**Freigabeentscheidung:** ☐ Nicht freigegeben ☐ Nachbesserung erforderlich ☐ Fachlich freigegeben

**Prüfer / Datum:** ______________________

> Eine erfolgreiche CI-Pipeline ersetzt weder den physischen A5-Druck noch die Prüfung mit echten Schlössern und Kindern. Merge nach `main` und öffentliche Veröffentlichung nur nach ausdrücklicher Freigabe.
