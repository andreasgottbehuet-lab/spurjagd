# Block 2 – A5-Referenzfall und Prüfnachweis (04.11.2026)

## Prüfbasis
- GitHub Actions `Quality checks`, Lauf [41825593529](https://github.com/andreasgottbehuet-lab/spurjagd/actions/runs/41825593529), geprüfter Commit `24d144b1d841079653d81259cae2afeac6b7003d`, Ergebnis **success**.
- Automatisierte Suite: **299 bestanden, 0 fehlgeschlagen**; TypeScript/Produktions-Build und Chromium-PDF-Prüfung erfolgreich.
- Im Lauf erzeugt: `verification/a5-browser-print.pdf`, `verification/a5-browser-report.json`, PNG-Vorschauen, weitere Protokolle. [Artefakt](https://github.com/andreasgottbehuet-lab/spurjagd/actions/runs/41825593529/artifacts/13318692958).
- Der geprüfte Standardfall umfasst 12 Kinder, 4 Gruppen zu 3 Kindern, 4 Stationen, 3 Besuche pro Gruppe, Codes `007`, `000`, `123`, `987`, insgesamt **12 Umschläge**, **36 Kinderseiten**, **3 Etikettenseiten**, **14 Spielleitungsseiten** = **53 A5-Hochformatseiten**.

## Was automatisiert nachgewiesen ist
- PDF-Seitengröße A5 Hochformat, Seitenanzahl 53 und keine leeren Textseiten; DOM-Geometrie gegen 128 × 190 mm.
- 12 Aufgabenblätter, 12 Antwortblätter, 12 Wegrätselseiten in korrekter Umschlagreihenfolge.
- Team-/Stations-/Blattkennung, vier Etiketten pro A5-Seite, Etikett-/Packlisten-/Umschlagabgleich.
- Dreistellige Schloss-Codes einschließlich führender Nullen in Spielleitungsunterlagen.
- Drucksperre bei ungültigen Codes, vertauschten oder fehlenden Kinderblättern, beschädigten Etiketten, Packlisten und falschen Ziel-/Codeangaben; Wiederfreigabe nach Korrektur.
- Trennung von Spielleitungsinformationen und Kinderseiten; PDF-Textextraktion prüft Blattarten und Seitenüberschriften.
- Unabhängige Unit-/Integrationstests prüfen unterschiedliche Teamrouten (`routeMode: 'varied'`) und den Zielort jedes Umschlags.

## Erweiterung dieses Blocks
Die Chromium-End-to-End-Prüfung `scripts/verify-a5-browser.mjs` wurde zusätzlich auf `routeMode: 'varied'` umgestellt. Sie kontrolliert die Einstellung nach dem Neuladen und verlangt vier tatsächlich ausgegebene Gruppenrouten mit mindestens zwei unterschiedlichen Stationsfolgen. Diese Erweiterung ist **noch nicht als erfolgreich ausgeführt bestätigt**, bis der CI-Lauf des neuen Commitstands abgeschlossen ist.

## Abnahmegrenzen
Der erfolgreiche Lauf 41825593529 prüfte den bisherigen Standardfall. Er belegt nicht automatisch den Erfolg der nachträglich ergänzten Browser-Variante mit unterschiedlichen Routen. Die folgenden Punkte sind noch offen:
- Neuer CI-Lauf für die geänderte End-to-End-Variante; PDF-/PNG-Artefakte anschließend visuell kontrollieren.
- Physischer Ausdruck am vorgesehenen Drucker: Skalierung 100 %, Ränder/Beschnitt, Lesbarkeit, Blattreihenfolge und Zuschnitt.
- Alle vier Codes an den tatsächlichen Zahlenschlössern öffnen; Umschläge anhand der Packliste füllen.
- Mindestens eine vollständige Route mit einem Kind aus der Zielaltersgruppe testen; Zielhinweise, Lösbarkeit und Zeitbedarf protokollieren.
- Browserdruckvergleich in Edge/Chrome, falls nicht durch dieselbe Chromium-Engine hinreichend repräsentiert.

**Freigabe:** Automatisierte technische Abnahme des ursprünglichen Standardfalls bestanden. Erweiterter Varianzfall und physische Praxiserprobung noch offen. Keine Behauptung einer vollständigen Druck-/Spielabnahme.
