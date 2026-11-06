# SPURJAGD – A5-Abnahme und Freigabeprotokoll

**Status: technische CI-Abnahme bestanden; physische Abnahme offen.** Ein erfolgreicher Browser-/PDF-Test ist kein Nachweis für einen Ausdruck auf dem vorgesehenen Drucker. Den Prüflauf immer dem tatsächlich freizugebenden Commit zuordnen.

## 1. Testdatensatz und Vorbereitung

- Standardfall: 12 Kinder, 3 Kinder pro Gruppe, 4 Stationen, 4 Teams, 60 Minuten. Dreistellige Codes `007`, `000`, `123`, `987`.
- Gruppenwege müssen separat geprüft werden; nicht jede Gruppe muss alle Stationen besuchen. Die nächste Station darf erst aus dem Wegrätsel hervorgehen.
- Zusätzlich je einen Test mit abweichender Gruppengröße, langen Ortsnamen, Fragenrätseln mit mehr als fünf Lösungsbuchstaben und unterschiedlichen Gruppenrouten durchführen.
- Lokale Windows-Prüfung: `powershell -ExecutionPolicy Bypass -File scripts/verify-windows.ps1`. Für Chromium und A5: `powershell -ExecutionPolicy Bypass -File scripts/verify-windows-browser.ps1`. Ohne Poppler (`pdfinfo`, `pdftotext`, `pdftoppm`) ist der PDF-Test nicht durchgeführt.
- CI-Artefakte: `verification/a5-browser-report.json`, `verification/a5-browser-print.pdf`, `verification/a5-preview-*.png`; Projektverwaltung: `verification/project-browser-report.json`. Im JSON müssen die Prüfungen bestanden sein und die Fehlerliste leer sein.

## 2. A5-Druckabnahme am echten Drucker

| Prüfschritt | Soll / Abnahmekriterium | Ergebnis |
| --- | --- | --- |
| Druckformat | A5 Hochformat (148 × 210 mm), 100 % Skalierung; Browser-Kopf-/Fußzeilen aus | ☐ OK ☐ Fehler |
| Blattumfang | Tatsächliche PDF-/Druckseitenzahl entspricht dem angezeigten Paket; keine Leerseiten oder unerwarteten Zusatzseiten | ☐ OK ☐ Fehler |
| Kinderblätter | Pro Umschlag genau ein Aufgabenblatt, ein Antwortblatt und mindestens ein Wegrätselblatt, lückenlos und in Reihenfolge | ☐ OK ☐ Fehler |
| Lesbarkeit | Keine abgeschnittenen Texte, ausreichend Platz zum Schreiben; auch Schwarz-Weiß lesbar | ☐ OK ☐ Fehler |
| Lösungsgeheimnis | Keine ausgeschriebenen nächsten Ziele oder Code-Lösungen auf Kinderblättern; Spielleiterinformationen bleiben getrennt | ☐ OK ☐ Fehler |
| Etiketten | Team, Station, Nummer und Blattzahl entsprechen der Kontrollliste; vier Etiketten je A5-Seite maximal | ☐ OK ☐ Fehler |
| Spielleitung | Routen, dreistellige Codes, Wegrätsel-Lösungen, Umschlagkontrolle und Sicherheitshinweise vollständig | ☐ OK ☐ Fehler |
| Mehrseitige Rätsel | Fortsetzungsseiten und Lösungsseiten vollständig, korrekt nummeriert und richtig zugeordnet | ☐ OK ☐ Fehler |
| Papierbogen | Angezeigte A5-Seitenzahl nicht mit A4-Bogenanzahl verwechseln; bei Duplex-/Mehrfachdruck Reihenfolge neu prüfen | ☐ OK ☐ Fehler |

**Orientierungswert für den Standardfall:** 4 Teams × 3 Stationsbesuche = **12 Umschläge**, mit je drei Kinderblättern **36 Kinderblätter** und **3 Etikettenseiten**. Für den derzeitigen Standarddatensatz sind **14 Spielleitungsseiten** und somit **53 logische A5-Seiten** vorgesehen. Andere Routen, Warnungen oder längere Wegrätsel können die Seitenzahl verändern; maßgeblich sind das aktuelle Druckmanifest und die tatsächlich erzeugte PDF.

## 3. Umschläge packen und Schlösser testen

1. Spielleitungsseiten und Etiketten von den Kinderblättern trennen.
2. Kinderblätter je Umschlag in der Reihenfolge **Aufgabe → Antwort → Wegrätsel (Teil 1 bis n)** bündeln.
3. Team, Station, Stationsnummer und Blattzahl mit der gedruckten Packliste abgleichen und jeden Umschlag einzeln abhaken.
4. Jedes Schloss mit dem zugeordneten Code am **realen Schloss** öffnen und wieder korrekt einstellen; führende Nullen wie `007` und `000` ausdrücklich testen.
5. Alle Teamrouten vom Start bis zum Ziel mit den **jeweiligen** Umschlägen durchgehen. Kein Team darf auf eine fremde Gruppenlösung angewiesen sein.
6. Mindestens eine vollständige Route mit einem Kind aus der Zielaltersgruppe lösen lassen; Verständlichkeit, eindeutige Zielhinweise und benötigte Zeit beobachten.
7. Wege, Straßenquerungen, Stationserreichbarkeit, Aufsicht, Start-/Zielpunkt und Materialrücknahme vor Ort prüfen.

**Bei Fehlern:** Betroffenen Umschlag nicht ausgeben. Fehler mit Team, Station, Blattnummer und Fehlerbild dokumentieren; nach Korrektur erneut drucken, packen und prüfen.

## 4. Dokumentierter Freigabeentscheid

| Feld | Eintrag |
| --- | --- |
| Datum / Prüfer | |
| Git-Commit / CI-Lauf / Ergebnis | |
| Browser / Version | |
| Drucker / Treiber / Papier / Skalierung | |
| Erwartete / tatsächliche A5-Seiten | |
| Gedruckte und kontrollierte Umschläge | |
| Getestete reale Schlösser / Codes | |
| Geprüfte Teamrouten / Altersprobe | |
| Abweichungen / Nachprüfungen | |
| Entscheidung | ☐ Freigabe ☐ Nacharbeit |
| Unterschrift / Datum | |

**Freigaberegel:** Nur wenn CI für den betreffenden Commit erfolgreich, alle Druck- und Spielproben bestanden und Abweichungen behoben sind, darf die A5-Funktion als praktisch abgenommen gelten. Für eine öffentliche Produktveröffentlichung sind außerdem rechtliche Angaben und Datenschutz zu prüfen.

## 5. Technische Prüftiefe und Grenzen

Die CI kontrolliert TypeScript/Build, Unit-/Integrationstests, Projektverwaltung im Chromium-Browser, Druckfreigabe bei beschädigten Etiketten/Packlisten, logische Seitenzahlen, Umschlagreihenfolge, Codes und Inhalte des erzeugten A5-PDFs. Die Packliste wird zusätzlich auf die je Umschlag geplanten dreistelligen Codes und nächsten Zielorte abgeglichen; manipulierte Angaben sperren den Druck. Die Prüfung der DOM-Datenattribute ersetzt nicht den Sichtabgleich des tatsächlich gedruckten Texts. Die Bildschirm-Packanleitung darf nicht im PDF erscheinen. Automatische Geometrie-, Text- und PDF-Seitenprüfungen können **nicht** alle Druckertreiberränder, ungünstige Zeilenumbrüche, physische Blattreihenfolgen, reale Schlossmechanik oder die Verständlichkeit für Kinder nachweisen.

Die eigentliche Abnahme erfolgt anhand dieses Protokolls und des ausgedruckten Spielpakets. Offene Prüfpunkte dürfen nicht als bestanden markiert werden.
