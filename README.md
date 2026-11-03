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
- Vorläufige Druckansicht des Spielplans
- Tests der Berechnungs-, Validierungs- und Routenoptionen; GitHub Actions führt Tests und Build bei Änderungen aus
- Mehrere lokale Projekte im Browser: automatisches Speichern, Wechseln, Neuanlegen und Löschen
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
- Spielziele sind Auswahloptionen; Codes, Lösungswörter, Rätselbibliothek und vollständige PDF-Pakete fehlen noch.
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

## Cloudflare Workers
Das GitHub-Repository mit Cloudflare Workers (Git-Integration) verbinden:
- Build-Befehl: `npm run build`
- Bereitstellungsbefehl: `npx wrangler deploy`
- Projektname: `spurjagd`

`wrangler.jsonc` stellt die statischen Assets aus `dist` bereit. Domain `spurjagd.de` wird nach Aktivierung bei netcup über Cloudflare-DNS angebunden.

## Nächste Ausbaustufe
1. Standorttyp (Feuerwehr, Spielplatz, Sportplatz, Wiese, frei).
2. Geprüfte Rätselbibliothek mit altersabhängigen Hilfen.
3. Pro Station vollständiger Schloss-Code oder Wort-/Bildbaustein.
4. Eindeutige Lösungsprüfung, Hilfekarten, Spielleiterunterlagen.
5. PDF-Erstellung direkt im Browser, ohne fortlaufende Serverkosten.

## Mehrsprachigkeit
Deutsch ist führend, Englisch als technische Oberfläche vorbereitet. Rätseltexte und Wortlösungen sind pro Sprache eigenständig zu prüfen.


## Entwicklungsstand 2026-11-03 – nicht freigegeben
- Planer: Schritte Gruppe/Zeit, Regeln, Standorte, Spielplan. Schieberegler für Teilnehmer, Gruppengröße und Rätselstationen.
- Eigene Start- und Zielangaben, Rückkehr zum gemeinsamen Startort möglich. Frühere Zielmodi bleiben für gespeicherte Projekte erhalten.
- Bei Schloss-Spielziel: freie dreistellige Codes je Station, auch führende Nullen. Deterministische Aufgaben mit Rechen-, Symbol- und Buchstabenrätsel; Vorschau mit Lösungen.
- Erster DIN-A4-Druckentwurf: Spielleitungsblatt, Stationsaufgaben und Etiketten. Druck nur bei vollständigen Codes aktiv.
- Entwürfe mit noch leeren Stationsnamen und unvollständigen Codes können gespeichert werden. Beim vorübergehenden Verkleinern des Stationsreglers werden Eingaben während der laufenden Sitzung zwischengespeichert; sie sind noch nicht über Projektwechsel hinweg gesichert.
- Offen: vollständige nächste-Stations-Hinweise pro Team, Druck-Preflight, altersgerechte Aufgabenprüfung, End-to-End- und Browserprüfungen, Build-/CI-/Deployment-Nachweis. Kein öffentlicher Release aus diesem Stand ableiten.

- Stand 2026-11-03 (weiterer Entwurf): Teambezogene Stationsblätter, separate Hinweise zum nächsten Ort, Umschlagetiketten und Vorabprüfung vor Druck. Der nächste Ort wird auf dem separaten Hinweis derzeit ausdrücklich genannt, noch nicht als eigenes Ortsrätsel verschlüsselt. Der Ausdruck muss physisch geprüft werden. Build, Tests und Deployment wurden in diesem Arbeitsgang nicht ausgeführt.
