# SPURJAGD – verbindliche Projektregeln für Entwicklungsagenten

Stand: 2026-11-02. Diese Datei ist die führende Arbeitsgrundlage für ChatGPT, Codex, Gemini und andere Entwicklungsagenten. **Vor jeder Änderung an Code oder Architektur zuerst lesen.** Bestehende Entscheidungen nicht stillschweigend umdeuten. Bei Konflikten aktuelle Nutzeranweisungen vorziehen und diese Datei mitaktualisieren.

## 1. Produkt und Zielgruppe (verbindlich)
- SPURJAGD ist **ausschließlich für Kinder und Jugendliche** und deren Eltern, Lehrkräfte sowie betreuende Erwachsene.
- Keine Kneipentouren, Trinkspiele, JGA- oder Erwachsenen-Spielmodi auf dieser Plattform. Keine alkoholbezogenen Spielmechaniken.
- Einfache, verständliche und sichere Schnitzeljagden und Schatzsuchen. Jüngere Kinder benötigen kurze, gegebenenfalls bildgestützte Aufgaben.
- **Kostenlose Grundversion ohne Werbung**, voll spielbar und ausdruckbar. Keine Werbung in Kinder- oder Elternansichten.
- Optionale spätere **kostenpflichtige Themenpakete** (z. B. Piraten, Detektiv/Gangster im altersgerechten fiktionalen Sinn, Feuerwehr, Abenteuer); keine aggressiven Abos und keine Paywall für Grundfunktionen. Noch **keinen Zahlungsanbieter** einbauen.
- Deutsch zuerst vollständig fertigstellen. Sprachabhängige Rätsel später je Sprache fachlich geprüft ergänzen; nicht blind übersetzen.

## 2. Fachliche Spielregeln
- Der Nutzer bestimmt Anzahl/Alter der Teilnehmenden, Teams, Zeitbudget, Spielziel, Orte und Beschreibungen.
- **Start: gemeinsam oder verteilt. Routen: gleich oder verschieden. Ziele: gemeinsam oder individuell**. Optionen dürfen erhalten bleiben, sollen Anfänger nicht überfordern; einfache Presets zuerst, Expertenoptionen bei Bedarf.
- Gehzeiten sind zunächst Annahmen, keine geprüften Wege oder garantierten kollisionsfreien Zeitfenster. Warnungen und Aufsichtshinweise notwendig.
- Papierbasierter Spielbetrieb ist MVP. **1 besuchte Station kann einen vollständigen Schloss-Code** ergeben; drei Ziffern sollen aus drei verständlichen Einzelaufgaben folgen. Alternative Modelle: Lösungswort, Bilder/Symbole.
- Eltern können bereits vorhandene Schloss-Codes vorgeben (führende Eingabe); führende Ziffernnullen erhalten, also **'007'** als String speichern, nicht als Zahl.
- Rätsel werden **rückwärts aus Zielziffern** erzeugt. Nie einen Code behaupten, der nicht zu den Lösungen passt.
- Erzeugung muss deterministisch über fest gespeicherte Seed-Werte erfolgen: gleicher Eingabestand + Seed = gleiche Aufgaben. Keine Neuerzeugung beim Öffnen oder Drucken.
- Klasse A: algorithmisch eindeutig lösbare Rätsel dürfen Schlossziffern liefern. Klasse B: ortsabhängige, körperliche, soziale Aufgaben nur mit bestätigten Gegebenheiten/Betreuerfreigabe; nicht ungesichert als Codequelle.
- Keine Wegbeschreibung, die Ziel/Station ohne Rätsel vorwegnimmt.
- Spielleitung benötigt ein **kompaktes Eltern-Notfallblatt** mit Gruppe, Station, Lösung, Code und nächstem Hinweis sowie Aufbau-, Material- und Sicherheitscheckliste.
- Auf Stationsumschlägen Team-/Stationszuordnung klar kennzeichnen, optional Hinweis zum Hängenlassen und Einsammeln; keine echten privaten Ortsangaben in Demo-Daten veröffentlichen.

## 3. Architektur und Entwicklungsgrundsätze
- Bestehender Stack: React, TypeScript, Vite, GitHub, Cloudflare Workers Static Assets; möglichst Local First, keine kostenpflichtige Live-KI pro Website-Nutzung.
- Klare Trennung von Domain-Modell, reinen Rätsel- und Routenfunktionen, Validierung und React-UI/Drucklayout; keine unnötige Framework-Überarchitektur.
- Prüffähige/seedbasierte Generatoren. Codes, Hinweise, Stationen und Druckseiten vor Ausgabe in einem **Preflight-Check** auf Vollständigkeit und Konsistenz prüfen.
- PDF zunächst über browserseitige HTML/SVG-DIN-A4-Druckansicht. Schwarz-Weiß-/Tintensparmodus vorsehen; **Druckpaket** inklusive Erwachsenenlösungen und Kinderblättern, logisch getrennt.
- Keine automatischen externen KI- oder Netzwerkdienste zur Erzeugung erforderlich; lokale KI nur als Entwicklungshilfe.
- Speicherung zunächst im Browser mit validiertem JSON-Export/Import. Projektwechsel vor unbeabsichtigtem Überschreiben schützen. Versionierte Migrationen vor neuen Pflichtfeldern implementieren. IndexedDB erst bei echtem Mehrwert (z. B. Bilder).
- Kinder-/Ortsdaten datensparsam behandeln: keine notwendige Registrierung, keine externen Tracker/Fonts, Standortangaben nicht ohne Zustimmung übertragen.
- Keine ungeprüften rechtlichen, steuerlichen, Umsatz- oder technischen Kostenzusagen.

## 4. Qualität und Release-Gates
1. GitHub-Änderungen niemals allein als 'erfolgreich veröffentlicht' bezeichnen. `npm test`, `npm run build`, CI und Cloudflare-Deployment nachweislich prüfen; sonst Grenze nennen.
2. Unit- und Eigenschaftstests: alle Ziffern 0–9, auch 000 und 007; unterschiedliche Altersgruppen/Seeds; unabhängige Lösungskontrolle; eindeutige Rätsel.
3. Teampläne prüfen: Besuche ohne Doppelstation pro Team, Zeitbudget, Zielankunft, gleiche/verteilte Starts; Kollisionen nicht pauschal ausschließen.
4. Import/Export roundtrip, Vorversionen und Speichervorgänge bei Projektwechsel testen.
5. Druck-Preflight prüfen: Anzahl Blätter, richtiger Team-/Stationsbezug, richtiger Code, nächste Station, kein fehlender Hinweis. Dokumente auf Papier gegen echte Schlösser testen.
6. Sicherheitshinweise: Aufsicht, Straßenquerung, Gewässer, Baustellen, Wetter, private Flächen, Verstecke sowie vollständiges Einsammeln von Material.
7. Vor öffentlichem Release Impressum, Datenschutzhinweise und Sicherheitsunterlagen klären.

## 5. Entwicklungsreihenfolge
- **v0.5:** aktuellen Build/Tests verifizieren, Speichern/Projektwechsel sichern, Seed-PRNG und mindestens drei inverse, unabhängig testbare Rätselmechaniken.
- **v0.6:** dreistellige frei vorgebbare Schloss-Codes, 1 Station = 1 kompletter Code, druckfertige DIN-A4-Kinderblätter, Master-Spickzettel, Stationsetiketten, Start- und Sicherheitsblatt.
- **v0.7:** kinderleichte Schnellstart-Vorlagen, altersgerechte Gestaltung, storybasierte Themen, mehr geprüfte Rätsel, gründliche Praxistests.
- Später: optionale **Piraten-, Detektiv-/Gangster-, Feuerwehr- und andere Kinder-/Jugendthemenpakete**, ohne Werbung.
- Vorerst **keine** GPS-Komplexität, Erwachsenenplattform, Payment-Integration oder Live-KI im Produktivbetrieb.

## 6. Projektführung
- Repository: https://github.com/andreasgottbehuet-lab/spurjagd (privat).
- `AGENTS.md` ist die führende Entwicklungsanweisung im Repo. `README.md` beschreibt den tatsächlich implementierten Stand; Behauptungen über bestehende Funktionen nur nach Codeprüfung.
- Entscheidungen und Änderungen an Zielgruppe, Geschäftsmodell, Datenmodell oder Spielregeln unmittelbar hier dokumentieren; keine parallelen widersprüchlichen Regeldateien.
- Wichtige Meilensteine nach Möglichkeit zusätzlich im persönlichen Google Drive sichern; niemals ungefragt Dropbox verwenden.

## 7. Schloss-Code-Konfiguration (Erweiterung v0.6)
- `GameConfig.stationCodes` ist ein optionales Verzeichnis von stabilen Stations-IDs zu Strings. Beim Bearbeiten sind leere oder noch unvollständige Ziffernfolgen bis vier Stellen zulässig; für die Rätsel-Ausgabe sind exakt drei oder vier ASCII-Ziffern erforderlich.
- `GameConfig.puzzleSeed` ist ein optionaler 32-Bit-Wert. Bei älteren Projekten ohne Seed wird er einmalig aus der bisherigen Projekt-ID abgeleitet; JSON-Importe müssen den ursprünglichen Seed behalten, auch wenn die lokale Projekt-ID gewechselt wird.
- Das Speicherformat `spurjagd-backup-1` und die Projektversion 1 bleiben rückwärtskompatibel. Geheimcodes und Lösungswege dürfen nicht auf Kinder-Druckseiten erscheinen. Eine gesonderte Spielleitungs-Druckansicht und vollständige A5-Paginierung bleiben eigene Release-Anforderungen.

## 8. Druckpaket-Entwurf (03.11.2026; noch nicht veröffentlicht)
- `GameConfig.routeClues` ist eine optionale Ziel-gebundene Zuordnung von `teamIndex:stopIndex` zu `{to,text}`. Manuelle Hinweise auf die nächste Station bzw. das Finale werden bei Änderungen der Route durch Zielabgleich als veraltet erkannt. Texte werden nicht automatisch als zutreffende Ortsrätsel garantiert.
- `src/print-kit.ts` baut Drucksätze aus dem gültigen Teamplan, bestehenden 3-/4-stelligen Schloss-Codes und manuellen Hinweisen. Bei fehlenden, unpassenden oder direkt verratenden Ortsrätseln sowie ungültigen Codes wird das vollständige Paket gesperrt. Alle Karten eines Durchlaufs werden unverändert vom gespeicherten Projekt-Seed erzeugt.
- Kinder erhalten getrennte Rätsel- und Folgehintkarten je Besuch, je zwei A5-Hochformatkarten auf DIN A4 quer mit Mittelschnittlinie; Schloss-Codes und Erläuterungen nur auf separat druckbaren Spielleiterseiten. Hinweiskarten dürfen erst nach gelöstem Stationsrätsel ausgehändigt werden.
- Die Druckfunktion ist derzeit ausschließlich ein GitHub-Entwurfsstand. Automatische Tests/Build ersetzen keinen kontrollierten Browser- und Papierdruck (A4 quer, 100 %), echte Schlossprüfung, Kontrolle der Kartenzuordnung und Erkennbarkeit geheimer Zielorte.

### Korrektur der Drucktrennung (03.11.2026)
- Rätselkarten und geheime Folgehintkarten werden nach Kartentyp auf getrennte Bögen verteilt und über getrennte Druckaktionen ausgegeben; Spielleitungsseiten bleiben eine dritte Ausgabe. Bei ungerader Anzahl bleibt die letzte Hälfte je Kartentyp leer. Die angezeigte Blattzahl umfasst beide Kartensätze, ohne Spielleitungsseiten.
- Zielnamenprüfung verwendet Unicode-Wortgrenzen statt Teilworttreffern: „Waldweg“ blockiert nicht wegen „Wald“. Direkt genannte vollständige Zielnamen bleiben blockierend. Dies ist weiterhin keine semantische Geheimhaltungsprüfung.
- Vier Teilaufgaben stehen im 2×2-Raster, damit lange Stationsnamen die Codezeile nicht in die Fußzeile schieben. Browserprüfung mit drei Stationen, vierstelligen Codes, Alphabethilfe, 80-Zeichen-Namen und 240-Zeichen-Hinweisen durchgeführt. Dies deckt nicht sämtliche Projekte, Druckertreiber oder Schriftvarianten ab; physische Druckerränder und echte Schlösser bleiben zu prüfen.
