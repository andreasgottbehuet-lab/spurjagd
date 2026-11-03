# SPURJAGD

Kostenloser, werbefreier Schnitzeljagd-Generator für Kinder und Jugendliche, Eltern, Lehrkräfte und betreuende Erwachsene. **Entwicklungsstand – kein geprüfter Release.** Die verbindlichen Regeln stehen in [AGENTS.md](./AGENTS.md).

## Implementiert (Code-Stand 2026-11-03)

- Vierstufige React-/TypeScript-Anwendung: Teilnehmer, Gruppen, Zeitbudget, Start-/Zielregeln, Stationen und Spielplan.
- Gemeinsamer oder verteilter Start; gleiche oder wechselnde Routenrichtung. Nicht jede Gruppe muss alle Stationen besuchen. Gehzeiten sind Nutzereingaben, keine realen Entfernungsberechnungen.
- Dreistellige Schloss-Codes je Station einschließlich führender Nullen (z. B. `007`). Drei deterministisch erzeugte und überprüfte Einzelrätsel pro Code: Rechnen, Symbole zählen, Buchstabenverschiebung.
- Wegrätsel zum nächsten Ort: Ortsbeschreibung, Buchstabenfragen, Buchstabenverdrehung oder eigene Hinweise. Die Zielorte werden auf den Kinderblättern nicht als Lösung ausgewiesen.
- **DIN A5 Hochformat als Druckstandard.** Pro Team und Stationsbesuch drei getrennte Blätter: Stationsaufgaben, Antwortblatt, Wegrätsel. Zusätzlich Spielleitungsübersicht und Stationsetiketten. Der gesamte Drucklauf verwendet derzeit A5.
- Druckprüfung kontrolliert Codes, Routen, Zielorte, Umschlagkennungen und Blattanzahlen. Fehler sperren die Druckfunktion.
- Lokale Projektverwaltung ohne Konto: Entwürfe im Browser speichern, Projekte wechseln, JSON-Backups exportieren/importieren. Keine serverseitige Speicherung der Projektinhalte.
- Tests für Planung, Codes, Wegrätsel, Speicherung, Druckpakete und einen vollständigen Mehrgruppen-Spielablauf sind im Repository vorhanden.

## Lokal entwickeln und prüfen

Voraussetzung: Node.js 22 oder neuer und npm.

```bash
npm install --no-audit --no-fund
npm test
npm run build
npm run dev
```

Unter Windows kann im Projektverzeichnis stattdessen der zusammenhängende Prüfablauf ausgeführt werden:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-windows.ps1
```

Der Befehl installiert Abhängigkeiten, führt Tests aus und erstellt den Produktions-Build. **Die erfolgreiche Ausführung ist noch nicht nachgewiesen.** Danach im Browser über `npm run dev` die Druckvorschau kontrollieren: A5 Hochformat, drei Kinderblätter je Umschlag, lesbare Rätsel und keine abgeschnittenen Inhalte. Druckdialoge und Seitenzahlen können je Browser und Drucker abweichen.

## Grenzen und offene Aufgaben

- Browser- und Druckertests, vollständiger Build, CI-Status und produktives Deployment sind noch nicht verifiziert.
- Die Spielleitungsübersicht und die Etiketten werden derzeit ebenfalls auf A5 gedruckt. Bei längeren Inhalten können zusätzliche Seiten entstehen; die berechnete Seitenzahl ist eine **Untergrenze**.
- Unterschiedliche Alters- und Schwierigkeitsgrade **je Team** sind im Datenmodell vorbereitet, aber noch nicht als Premiumfunktion aktiviert.
- Die Aufgabenbibliothek ist noch begrenzt; Ortsbeschreibungen dienen bisher vor allem als Grundlage für Wegrätsel, nicht als frei erfundene stationsbezogene Codeaufgaben.
- Routen sind keine Karten-/Wegeoptimierung. Querungen, Gewässer, Baustellen, Privatflächen, Wetter und Aufsicht müssen Erwachsene vor Ort prüfen.
- Projekte liegen im Browserprofil. Löschen der Browserdaten kann sie entfernen; JSON-Sicherungen regelmäßig exportieren. Es gibt keine Gerätesynchronisation.
- Datenschutz-/Impressumsprüfung, reale Nutzertests und Veröffentlichung fehlen. Es gibt derzeit keine Bezahlfunktion.

## Bereitstellung (noch nicht freigegeben)

Der Stack verwendet Vite, React, TypeScript und Cloudflare Workers mit statischen Assets. `npm run build` erstellt `dist`; `npm run deploy` ruft Wrangler auf. Vor öffentlicher Freigabe Tests, Build, Druckpakete und rechtliche Angaben nachweislich prüfen.

**Produktentscheidung:** Kostenlose Grundversion bleibt vollständig spielbar und werbefrei. Erweiterte Funktionen bzw. Themenpakete können später kostenpflichtig werden; keine verpflichtenden Nutzerkonten und vorerst keine Zahlungsintegration.
