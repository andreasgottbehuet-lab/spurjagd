# SPURJAGD

Mehrsprachiger Generator für Schnitzeljagden, Rätseltouren und Gruppenabenteuer.

## Projektstand: Prototyp 0.2

Der erste Planungsassistent ist über Cloudflare Workers bereitstellbar. Die Oberfläche ist auf Deutsch und Englisch vorbereitet.

### Bereits umgesetzt
- Vierstufiger Assistent für Teilnehmer, Standorte, Zeitansätze und Spielplan
- Teilnehmerzahl und Gruppengröße mit möglichst gleichmäßiger Teamverteilung
- Standortnamen und individuelle Standortbeschreibungen; Stationen hinzufügen und entfernen
- Zeitberechnung anhand der **vom Nutzer festgelegten** durchschnittlichen Rätsel- und Gehzeit sowie Zeit für Start/Finale
- Automatische Begrenzung der Stationen je Team auf das verfügbare Zeitbudget
- Versetzte Reihenfolge und Startorte; Warnhinweis, wenn Teams sich Startorte teilen
- Vorläufige Druckansicht des Spielplans
- Tests der Berechnungs- und Validierungslogik
- Kein Login, keine Datenbank, keine serverseitige Speicherung der Eingaben

### Grenzen dieser Version
- Die Gehzeit gilt pauschal **pro Wegabschnitt**, nicht als Entfernungs- oder Routingberechnung. Start- und Rückweg werden mitgezählt.
- Die Stationen werden zyklisch verteilt. Eine optimale Reihenfolge im Straßennetz oder Vermeidung gleichzeitig belegter Standorte ist **nicht** berechnet.
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

## Geplant für Version 0.3
1. Standorttyp (Feuerwehr, Spielplatz, Sportplatz, Wiese, frei).
2. Geprüfte Rätselbibliothek mit altersabhängigen Hilfen.
3. Pro Station vollständiger Schloss-Code oder Wort-/Bildbaustein.
4. Eindeutige Lösungsprüfung, Hilfekarten, Spielleiterunterlagen.
5. PDF-Erstellung direkt im Browser, ohne fortlaufende Serverkosten.

## Mehrsprachigkeit
Deutsch ist führend, Englisch als technische Oberfläche vorbereitet. Rätseltexte und Wortlösungen sind pro Sprache eigenständig zu prüfen.
