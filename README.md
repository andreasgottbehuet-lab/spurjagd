# SPURJAGD

Mehrsprachiger Generator für Schnitzeljagden, Rätseltouren und Gruppenabenteuer.

## Projektstand: Prototyp 0.3

Der erste Planungsassistent ist über Cloudflare Workers bereitstellbar. Die Oberfläche ist auf Deutsch und Englisch vorbereitet.

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
- Kein Login, keine Datenbank, keine serverseitige Speicherung der Eingaben

### Grenzen dieser Version
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
