# SPURJAGD

> **Verbindliche Projektentscheidungen für alle Entwicklungsagenten:** [AGENTS.md](./AGENTS.md) lesen. Zielgruppe ausschließlich Kinder und Jugendliche. Voll spielbare kostenlose Grundversion ohne Werbung. Optionale spätere Kinder-Themenpakete (Piraten, Detektive/Gangster etc.).


Mehrsprachiger Generator für Schnitzeljagden, Rätseltouren und Gruppenabenteuer.

## Projektstand: Entwicklungszweig 0.5 (noch nicht als Release verifiziert)

Der erste Planungsassistent ist über Cloudflare Workers bereitstellbar. Die Oberfläche ist auf Deutsch und Englisch vorbereitet.

### Im Repository vorhanden
- Deterministischer Rätsel-Prototyp in `src/puzzles.ts`: rückwärts erzeugte Aufgaben aus 3-stelligen Codes (Mathematik, Symbolzählung, Caesar-Verschlüsselung).
- Algorithmische Selbstprüfung, inklusive Tests für 000 bis 999 in `tests/puzzles.test.mjs`.
- Noch **keine Integration** dieser Rätsel in UI, Projektformat oder A4-Spielpakete; Qualitäts- und Build-Prüfungen stehen aus.

### Bereits umgesetzt
- Vierstufiger Assistent für Teilnehmer, Standorte, Zeitansätze und Spielplan
- Teilnehmerzahl und Gruppengröße mit möglichst gleichmäßiger Teamverteilung
- Standortnamen und individuelle Standortbeschreibungen; Stationen hinzufügen und entfernen
- Zeitberechnung anhand der **vom Nutzer festgelegten** durchschnittlichen Rätsel- und Gehzeit sowie Zeit für Start/Finale
- Automatische Begrenzung der Stationen je Team auf das verfügbare Zeitbudget
- Wählbarer Start: alle Teams am selben Ort oder auf Stationen verteilt
- Routenführung: gleiche Umlaufrichtung oder wechselnde Umlaufrichtung
- Ziel: gemeinsamer Treffpunkt oder Rückkehr zur eigenen Startstation
- Warnhinweise bei gemeinsamen Starts und begrenzten Standorten
- Drei- und vierstellige Schloss-Codes mit führenden Nullen, deterministischen Rätseln und gespeichertem Seed
- Getrennte A4-Druckausgaben für Rätselkarten, geheime Hinweise und Spielleitungs-Lösungen; vier Aufgaben im 2×2-Raster
- Ein gemeinsamer Hinweis pro Zielort bzw. Finale, mit optionalen individuellen Teamhinweisen; bestehende Hinweise bleiben erhalten und Zieländerungen werden geprüft
- Tests der Berechnungs-, Validierungs- und Routenoptionen; GitHub Actions führt Tests und Build bei Änderungen aus
- Mehrere lokale Projekte im Browser: unmittelbares Speichern gültiger Änderungen, geschütztes Wechseln und Neuanlegen sowie Löschen nach Bestätigung
- Validierter Export und Import als versionierte JSON-Sicherungsdatei; importierte Projekte erhalten eine neue ID
- Kein Login, keine Datenbank, keine serverseitige Speicherung der Eingaben

### Grenzen dieser Version
- Der Browser speichert Projekte nur auf diesem Gerät und in diesem Browserprofil (localStorage). Löschen von Browserdaten kann Projekte entfernen. Regelmäßig JSON-Backups exportieren.
- Kein Synchronisieren zwischen Geräten; JSON-Backups enthalten alle Standortbeschreibungen im Klartext.
- Die öffentliche Anwendung benötigt vor dem Produktivstart passende Rechtstexte und eine Datenschutzprüfung.
- Die Gehzeit gilt pauschal **pro Wegabschnitt**, nicht als Entfernungs- oder Routingberechnung. Start- und Rückweg werden mitgezählt.
- Routen entsprechen einem einfachen Stationsrundkurs: gleiche Richtung oder wechselnde Richtung. Unterschiedliche, frei optimierte oder manuell zugewiesene Routen und konfliktfreie Zeitfenster fehlen noch.
- Bei gleichem Start können mehrere Teams gleichzeitig an derselben Station ankommen. Eine automatische Wartezeitplanung fehlt.
- Standortbeschreibungen führen noch nicht automatisch zu Rätseln.
- Schloss-Rätsel und das Druckpaket sind im Entwicklungsbranch implementiert. Lösungswort- und Karten-Spielziele sind weiterhin nur Auswahloptionen. Physischer Druck und echte Schlösser sind noch nicht abgenommen.
- Ungültige Zwischenstände (z. B. eine Station ohne Namen) bleiben zunächst nur in der geöffneten Oberfläche. Projektwechsel, Neuanlage und Importübernahme bleiben dann gesperrt; beim Verlassen warnt der Browser. Eingaben korrigieren oder die betreffende Station entfernen. Bei vollem Browserspeicher kann ein gültiges Projekt weiterhin als JSON exportiert werden.
- Zeitansätze sind keine Sicherheitsprüfung; Zugänge, Querungen, Aufsicht und Wetter müssen Erwachsene prüfen.
- Vorschau ist noch nicht für den öffentlichen Regelbetrieb geeignet; Impressum und Datenschutz stehen aus.

## Lokal ausführen
Node.js 22 oder höher installieren:

```bash
npm install
npm test
npm run build
npm run dev
```

### Browser-Regressionsprüfung

Die Tests in `tests/browser/project-flow.test.mjs` laufen getrennt von `npm test`. Sie verwenden künstliche Daten in isolierten Browserkontexten und ändern keine bestehenden Browserprofile. Playwright muss in der Prüfumgebung vorhanden sein. Optional lokal bereitstellen:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
```

In einem Terminal den Entwicklungsserver auf Port 5174 starten, im zweiten die Tests ausführen:

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

```bash
node --test tests/browser/project-flow.test.mjs
```

Optionale Umgebungsvariablen: `TEST_URL` für einen anderen lokalen Prüfserver, `PLAYWRIGHT_MODULE` für ein vorhandenes Playwright-Modul und `BROWSER_EXECUTABLE` für einen vorhandenen Chromium-/Edge-Browser. Die GitHub-Standardprüfung führt weiterhin Unit-Tests und Produktionsbuild aus; die Browserfälle sind ein zusätzlicher separater Prüfschritt.

## Cloudflare Workers
Das GitHub-Repository mit Cloudflare Workers (Git-Integration) verbinden:
- Build-Befehl: `npm run build`
- Bereitstellungsbefehl: `npx wrangler deploy`
- Projektname: `spurjagd`

`wrangler.jsonc` stellt die statischen Assets aus `dist` bereit. Domain `spurjagd.de` wird nach Aktivierung bei netcup über Cloudflare-DNS angebunden.

## Nächste Ausbaustufe
1. Papierdruck, Druckerränder und echte Schlösser praktisch prüfen.
2. Großdruck ergänzen.
3. Beteiligung aller Kinder bei unterschiedlichen Gruppengrößen verbessern.
4. Weitere geprüfte Rätselarten und altersabhängige Hilfen ergänzen.

## Mehrsprachigkeit
Deutsch ist führend, Englisch als technische Oberfläche vorbereitet. Rätseltexte und Wortlösungen sind pro Sprache eigenständig zu prüfen.
