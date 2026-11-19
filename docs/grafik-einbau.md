# Grafik-Einbau in Druckseiten – Analyse (Stand: HEAD)

Nur Analyse, kein Code geändert. Alle Aussagen beziehen sich auf die genannten Dateien und Funktionen.
Ist-Zustand: `src/main.tsx` enthält kein `<img>`, und `public/` enthält nur `robots.txt`.

## 1. A5-Höhenprüfung

- `src/a5-page-packing.ts`: `A5_USABLE_HEIGHT_MM = 190`. `measureA5Elements` misst jedes `.print-sheet`
  mit `Math.max(rect.height, element.scrollHeight) + marginTop + marginBottom` (über `getBoundingClientRect`
  und `getComputedStyle`) und rechnet dann in `measureA5Sheets` mit `96/25.4` px je mm in mm um.
- Die Messung ist eine Momentaufnahme des DOM. Ein Bild ohne feste Höhe, das noch nicht geladen ist, trägt
  0 px oder nur seine Platzhalterhöhe bei. Die Prüfung kann also bestehen, obwohl die Seite nach dem Laden
  zu hoch ist.
- Diese Momentaufnahme nutzen drei Stellen:
  - `src/main.tsx`, `useEffect` mit `buildPackedA5PrintCopy(packet)`: Druckvorschau `measuredPrintSummary`.
    Er läuft nur bei einem React-Render. Ein späteres `load` eines Bildes löst keine neue Messung aus.
  - `src/main.tsx`, `onClick` des Druckknopfs (`className="print"`): `measureA5Elements(physicalSheets)` und
    `packA5Blocks(blocks)`. Druck gesperrt bei `heightMm > A5_USABLE_HEIGHT_MM`.
  - Danach `buildPackedA5PrintCopy`. Die Kopie entsteht über `cloneNode(true)` der Kinder, und `getOverflow`
    misst die eingehängte Kopie. Direkt danach folgt `window.print()`, ohne auf Bilder zu warten.
- `buildPackedA5PrintCopy` wirft `A5-Einzelblatt überschreitet 190 mm`, wenn ein Originalblatt höher ist.
  Ein großes Bild führt also zur Drucksperre statt zu einem automatischen Umbruch.
- `packA5Blocks` legt Blätter nur bei gleichem `owner` und gleicher `section` zusammen und lehnt
  `heightMm > usableHeightMm` ab. Ein Bild kann ein Blatt so vergrößern, dass zwei bisher zusammengelegte
  Blätter getrennt werden. Dadurch ändert sich die physische Seitenzahl.
- Breite: Der Druckknopf-Handler bricht bei `width > 128.01` mm ab
  (`Verdichtete A5-Seiten überschreiten 128 mm Breite`). `auditA5PageBounds` in `src/print-dom-audit.ts`
  prüft ebenfalls 128 × 190 mm.
- Folgerung: Bilder brauchen feste Maße in mm (`width`/`height` bzw. `aspect-ratio`) in einem Container
  mit fester Höhe. Dann hängt die Messung nicht vom Ladezeitpunkt ab.

## 2. Seitenzähler im Manifest

- `src/print-manifest.ts`, `createPrintManifest`: `minimumSheets = taskSheets + organizerSheets + labelSheets`.
  - `taskSheets` ist die Summe von `sheetCount = 1 + routeSheetCount(...)` je Umschlag.
  - `organizerSheets` kommt aus `organizerSheetCount` (Routen + Codes + Lösungen + Kontrolle + `1`
    Sicherheitsblatt + `organizerCautionSheetCount`).
  - `labelSheets = ceil(envelopes / LABELS_PER_A5_SHEET)`.
  - Diese Zählung ist rein logisch: Ein Bild auf einem bestehenden Blatt ändert sie nicht.
    Ein zusätzliches Blatt (Urkunde/Deckblatt) zählt sie nicht mit.
- `src/print-dom-audit.ts`, `auditRenderedPrintCategories`: vergleicht die Gesamtzahl und die drei
  Kategorien mit den DOM-Zahlen aus `main.tsx`. Diese werden über `querySelectorAll` auf `.print-sheet`,
  `.print-organizer-sheet`, `.print-child-sheet` und `.print-label-sheet` gezählt.
  - Ein neues `.print-sheet` ohne eine dieser Klassen ergibt `Druckpaket enthält nicht zugeordnete A5-Blätter.`
  - Ein neues Blatt mit einer dieser Klassen, ohne angepasstes Manifest, ergibt
    `… von … vorgesehenen A5-Blättern vorhanden`. Der Druck ist gesperrt.
- `auditRenderedEnvelopes`: Jedes `.print-child-sheet` braucht eine gültige `data-envelope-id` und
  `data-sheet-kind` `task` oder `route`. Die Reihenfolge muss Aufgabe → Wegrätsel sein.
  Ein Zusatzblatt als Kinderblatt verletzt das.
- `src/a5-page-packing.ts`, `physicalA5Manifest`: Alles, was weder `print-organizer-sheet` noch
  `print-label-sheet` ist, gilt als Kinderblatt. Ohne `envelopeId` folgt
  `A5-Manifest: Umschläge auf einer Kinderseite vermischt`.
  `main.tsx` prüft danach `physical.childSheets !== printManifest.taskSheets` und die Blattzahl je Umschlag.
- `src/print-audit.ts`, `auditPrintPacket`: prüft Plan, Codes und Wegrätsel, aber keine Blätter oder Bilder.
  Er ist von Grafiken nicht betroffen.
- Test `tests/print-css.test.mjs`, „Alle Druckseiten werden einer der drei geprüften Blattkategorien
  zugeordnet“, erwartet genau 6× `className="print-sheet print-organizer-sheet"` und 2×
  `className="print-sheet print-child-sheet"` in `src/main.tsx`. Jedes neue Blatt dieser Art macht den Test rot.
  Er müsste dann angepasst werden.

## 3. Tintensparmodus / Schwarz-Weiß-Druck

- Einen Tintensparmodus gibt es im Code nicht. In `src/`, `tests/` und `README.md` gibt es keinen Treffer für
  Tintensparmodus, `grayscale` oder Schwarz-Weiß. Gefordert ist er in `AGENTS.md` (Abschnitt 3,
  „Schwarz-Weiß-/Tintensparmodus vorsehen“). Geprüft wird er nur manuell in `docs/a5-print-acceptance.md`
  („auch Schwarz-Weiß lesbar“).
- `src/style.css` erzwingt Farbe an mehreren Stellen mit `-webkit-print-color-adjust:exact;
  print-color-adjust:exact`: Teamfarben `.print-child-sheet[data-team-color]`, `.print-label[...]`,
  `.team-route-line[...]`, `.print-checklist-row[...]`, `.print-code-line`, `.wordsearch-cell`,
  `.route-answer-highlight`, `.arrow-start-cell`, `.symbol-cell`. Die Teamzuordnung hängt teils an Farbe
  (`--team-accent`, `--team-tint`) und zusätzlich am Text (Teamname).
- Folgen für Bilder:
  - Ein Bild als CSS-`background-image` würde wie andere Hintergründe behandelt. Ohne
    `print-color-adjust:exact` kann der Browser es weglassen.
  - Ein `<img>` ist Inhalt und wird gedruckt, auch farbig und vollflächig. Einen Filter oder Schalter, der
    das beim Tintensparen abschwächt, gibt es nicht.
  - Inhalte, die nur in der Grafik stehen (Farbe als einzige Information), wären beim Schwarz-Weiß-Druck
    nicht abgesichert.
- `tests/print-css.test.mjs`:
  - „Keine widersprüchliche A4-Seitengröße im Druckstylesheet“ verlangt, dass jede `@page { … }`
    `size: A5 portrait;` enthält. Eine Urkunde im Querformat über eine eigene `@page`-Regel würde den
    Test brechen.
  - „A5 print packet is isolated from interactive planner elements“ verlangt
    `.wizard-panel > :not(.print-packet){display:none!important;}`.
  - Kein Test prüft Bilder oder Graustufen.
- Folgerung: Grafiken als Strichzeichnung bzw. kontrastreiche Graustufen, alle Informationen zusätzlich als
  Text. Vor dem Einbau einen echten Tintensparschalter entwerfen (nicht Teil dieser Analyse).

## 4. Auslieferung statischer Dateien aus `public/`

- `vite.config.ts`: `defineConfig({ plugins: [react()] })`. `publicDir`, `base` und `build.outDir` sind nicht
  gesetzt, es gelten die Vite-Standards. Dateien aus `public/` werden unverändert, ohne Hash, ins
  Wurzelverzeichnis von `dist/` kopiert. Im Code werden sie mit absolutem Pfad angesprochen (`/datei.svg`).
  Bilder, die über `import` aus `src/` eingebunden werden, bekommen dagegen gehashte Dateinamen.
- `package.json`: `build` = `tsc --noEmit && vite build`, `deploy` = `npm run build && wrangler deploy`.
- `wrangler.jsonc`: `assets.directory: "./dist"` und `not_found_handling: "single-page-application"`.
  Ein falscher Bildpfad liefert also kein 404, sondern `index.html`. Das Bild bleibt leer, und
  `measureA5Elements` misst dann ein Blatt ohne Bildhöhe (siehe 1).
- `AGENTS.md` Abschnitt 3 schließt externe Fonts und Tracker aus. Bilder deshalb lokal in `public/` oder
  `src/` ablegen, nicht von fremden Servern laden.

## 5. Empfehlung

**Urkunde – sicherste Stelle: eigener Drucklauf außerhalb von `section.print-packet`, A5 hoch.**
- Begründung: Alle Zähl- und Höhenprüfungen arbeiten nur auf `.print-packet` bzw. dessen `.print-sheet`
  (`buildPackedA5PrintCopy`, `auditRenderedPrintCategories`, `physicalA5Manifest`, `createPrintManifest`).
  Ein Blatt außerhalb des Pakets ändert weder `minimumSheets` noch die Kategorien oder die
  Umschlagreihenfolge. Die Urkunde gehört auch inhaltlich nicht in einen Umschlag.
- Zu beachten:
  - Der Druck-CSS blendet `.wizard-panel > :not(.print-packet)` aus. Die Urkunde braucht daher einen eigenen
    Druckzustand, der das Paket ausblendet und erst nach dem Druckdialog zurückgesetzt wird. Nach früherer
    Review-Erfahrung darf die Klasse nicht sofort nach `window.print()` entfernt werden.
  - `@page` muss A5 portrait bleiben (Test oben).
  - Das Bild braucht feste mm-Maße.

**Deckblatt – sicherste Stelle: erstes Blatt im Paket als `print-organizer-sheet` (vor `key="safety-check"`),
mit eigenem `data-print-section`.**
- Begründung:
  - `measureA5Elements` gibt Organisatorblättern den `owner` `leitung`. `packA5Blocks` legt nur Blätter mit
    gleichem `owner` und gleicher `section` zusammen. Kinder- oder Etikettenblätter kommen also nie dazu.
    `physicalA5Manifest` zählt das Blatt ohne Umschlagbezug.
  - Ein Kinder- oder Etikettenblatt würde dagegen `auditRenderedEnvelopes`, `auditRenderedLabels` und
    `physicalA5Manifest` (`Umschläge auf einer Kinderseite vermischt`) brechen.
  - `organizerSheetCount` (`src/print-manifest.ts`) hat schon ein festes Zusatzblatt (`+1` Sicherheitsblatt).
- Wechselwirkung mit der Verdichtung (belegt):
  - Kein Blatt in `src/main.tsx` setzt `data-print-section`. `measureA5Elements` setzt dann für alle
    Organisatorblätter `section` = `organizer` (`element.dataset.printSection??'organizer'`).
  - `packA5Blocks` legt zwei `leitung`-Blöcke zusammen, wenn beide unter `usableHeightMm/2` liegen, die
    Vorseite nur einen Block hat und die Reserve (`usableHeightMm-36`) reicht. Ohne eigenes Attribut käme ein
    kurzes Deckblatt also mit dem kurzen Sicherheitsblatt auf eine physische Seite.
  - Die Packlogik wertet das Attribut aus: `measureA5Elements` übernimmt `dataset.printSection` als
    `section`. Beleg ist der Test „Organizer measurement keeps each print section separate for 50-percent
    compaction“ in `tests/a5-page-packing.test.mjs`: zwei 60-mm-Blätter mit `codes` bzw. `planning-hints`
    ergeben 2 Seiten.
  - `buildPackedA5PrintCopy` ruft dieselbe Messung auf. Auch die Druckkopie bleibt dann getrennt.
  - Grenze: Das Attribut trennt nur das Deckblatt von den anderen Blättern. Die übrigen Organisatorblätter
    (alle `organizer`) bleiben untereinander verdichtbar wie bisher.
- Nötige Begleitänderungen (nicht ausgeführt):
  - `organizerSheetCount` um 1 erhöhen. Sonst meldet `auditRenderedPrintCategories` einen Unterschied
    zwischen DOM-Zahl und Manifest.
  - Zähltest in `tests/print-css.test.mjs` von 6 auf 7 anpassen.
  - Am Deckblatt `data-print-section="cover"` setzen (Name frei wählbar, aber eindeutig). Ein Test nach dem
    Muster oben misst `cover` und `organizer` mit je 60 mm und erwartet 2 Seiten.
  - Bild mit fester Höhe deutlich unter 190 mm. Sonst wirft `buildPackedA5PrintCopy`
    `A5-Einzelblatt überschreitet 190 mm`.
- Alternative ohne jede Wechselwirkung: das Deckblatt wie die Urkunde außerhalb von `.print-packet` drucken.
  Das braucht aber einen eigenen Druckzustand (siehe Urkunde) und einen zweiten Druckvorgang.
