# SPURJAGD

Mehrsprachiger Generator für Schnitzeljagden, Rätseltouren und Gruppenabenteuer.

## Projektstatus
**Planungsprototyp 0.1** – noch kein vollständiger Rätsel- oder PDF-Generator.

- Responsive Oberfläche auf Deutsch und Englisch (erste Übersetzung).
- Teilnehmerzahl, Gruppengröße, Altersgruppe, Dauer, Orte und Spielziel konfigurierbar.
- Automatische ausgeglichene Teamverteilung und versetzte Reihenfolge der Standorte.
- Browser-Druckansicht für den vorläufigen Plan.
- Keine Anmeldung, Datenbank oder serverseitige Speicherung der Eingaben.
- Vorkonfiguration für Cloudflare Workers Static Assets.

### Einschränkungen
- Standortzeit (15 Minuten) ist nur eine Planungsannahme, keine geprüfte Wegzeit.
- Derzeit keine automatische Berechnung realer Wege, Aufsicht oder Verkehrssicherheit.
- Noch keine Rätsel, Schloss-Codes, finale Lösungswörter oder vollständigen PDFs.
- Vorsicht: Druckansicht ist ein Plan, kein fertig einsetzbares Schatzsuche-Paket.

## Lokal starten
Node.js LTS installieren, dann:

```bash
npm install
npm run dev
```

Build prüfen:

```bash
npm run build
npm test
```

## Cloudflare Workers
Für das vorhandene GitHub-Repository folgende Einstellungen verwenden:
- Build-Befehl: `npm run build`
- Deploy-Befehl: `npx wrangler deploy`
- Projektname: `spurjagd`

Die Datei `wrangler.jsonc` weist Cloudflare an, die statischen Assets aus `dist` auszuliefern. Die Domain `spurjagd.de` wird erst nach Aktivierung bei netcup angebunden.

## Nächste Entwicklung
1. Konsistente Rätselbibliothek mit altersgerechten Erklärungen und Lösungen.
2. Vollständige Stationscodes, Wort- und Bilderrätsel mit automatischen Prüfungen.
3. Druckfertige Teambriefe, Einzelseiten, Aufbau- und Lösungsblätter.
4. Standortbeschreibungen und realistische Routenplanung.
5. Freigabeprozess, Impressum, Datenschutz, optionaler Support-Link.

## Sprache
Deutsche Oberfläche ist führend. Englische Texte sind vorerst nur eine technische Vorbereitung. Sprachabhängige Rätsel müssen separat fachlich geprüft werden.
