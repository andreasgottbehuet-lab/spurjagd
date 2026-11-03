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
- PDF zunächst über browserseitige HTML/SVG-DIN-A5-Hochformat-Druckansicht. Schwarz-Weiß-/Tintensparmodus vorsehen; **Druckpaket** inklusive Erwachsenenlösungen und Kinderblättern, logisch getrennt.
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
- **v0.6:** dreistellige frei vorgebbare Schloss-Codes, 1 Station = 1 kompletter Code, druckfertige DIN-A5-Kinderblätter, Master-Spickzettel, Stationsetiketten, Start- und Sicherheitsblatt.
- **v0.7:** kinderleichte Schnellstart-Vorlagen, altersgerechte Gestaltung, storybasierte Themen, mehr geprüfte Rätsel, gründliche Praxistests.
- Später: optionale **Piraten-, Detektiv-/Gangster-, Feuerwehr- und andere Kinder-/Jugendthemenpakete**, ohne Werbung.
- Vorerst **keine** GPS-Komplexität, Erwachsenenplattform, Payment-Integration oder Live-KI im Produktivbetrieb.

## 6. Projektführung
- Repository: https://github.com/andreasgottbehuet-lab/spurjagd (privat).
- `AGENTS.md` ist die führende Entwicklungsanweisung im Repo. `README.md` beschreibt den tatsächlich implementierten Stand; Behauptungen über bestehende Funktionen nur nach Codeprüfung.
- Entscheidungen und Änderungen an Zielgruppe, Geschäftsmodell, Datenmodell oder Spielregeln unmittelbar hier dokumentieren; keine parallelen widersprüchlichen Regeldateien.
- Wichtige Meilensteine nach Möglichkeit zusätzlich im persönlichen Google Drive sichern; niemals ungefragt Dropbox verwenden.

## Entscheidung 2026-11-03 – Planer
- Schrittfolge: Gruppe & Zeit, Spielregeln, Standorte, Spielplan.
- Teilnehmer, Gruppengröße und Anzahl der Rätselstationen per Schieberegler mit Zahl.
- Startort und Zielort als eigene Eingaben; Checkbox „Start ist Ziel“ setzt den Zielmodus `origin`. Der bisherige Modus `start` (Rückkehr zur jeweils ersten Rätselstation) bleibt für alte Projekte erhalten.
- `startPoint` ist optional, damit bestehende Sicherungen weiterhin gelesen werden können. Bei verteilten Starts bleibt der tatsächliche erste Rätselort gruppenabhängig; der Startort bezeichnet dann den gemeinsamen Treffpunkt. Die Routenlogik und Bezeichnungen müssen vor Release entsprechend geprüft werden.
- Noch offen: Standortregler ohne Datenverlust bei Verkleinerung, vollständige Preflight-Prüfung, Rätselintegration, Druckpaket, reale Geräte- und Browserprüfung.

## Entscheidung 2026-11-03 – A5-Druck und Arbeitsweise
- Verbindliches Standardformat für sämtliche Kinderblätter: **DIN A5 Hochformat**, nicht DIN A4. Drei getrennte Blätter pro Team und Stationsbesuch: 1. Stationsaufgaben, 2. Antwort-/Arbeitsblatt, 3. Wegrätsel zum nächsten Ort.
- Zielorte dürfen auf Kinderblättern nicht im Klartext vorweggenommen werden. Ortsrätsel und Codes werden vor Druck auf Konsistenz geprüft. Umschläge sind gruppen- und stationsbezogen zu beschriften.
- Spielleitungsübersicht und Etiketten dürfen künftig bei getrenntem Drucklauf auf A4 ausgegeben werden; bis dahin gilt A5 für den gesamten Drucklauf. Mindestseitenzahlen sind Untergrenzen, keine bestätigten physischen Druckseiten.
- Größere zusammenhängende Entwicklungsblöcke einschließlich Fehlerkorrekturen, Tests und Dokumentation bearbeiten. Bei kurzen Nutzeranweisungen wie „Weiter“ nicht nachfragen. Windows-Laptop als mögliche lokale Testumgebung nutzen; keinen lokalen Zugriff behaupten, solange er nicht besteht.
- Bestehende README-Angaben zu A4 und fehlenden Rätseln sind überholt und müssen an den Code angeglichen werden.

## Entscheidung 2026-11-03 – Datenintegrität beim Projektwechsel
- Beim Wechseln, Neuanlegen und Importieren müssen noch nicht automatisch gespeicherte Änderungen am aktuellen Projekt zuerst synchron gespeichert werden. Schlägt dies fehl, wird der Wechsel abgebrochen und ein Hinweis angezeigt.
- Beschädigte lokale Projektlisten dürfen beim Initialisieren nicht durch einen leeren Entwurf überschrieben werden. Automatisches Speichern bleibt bei Ladefehlern deaktiviert.
- Neue Projekte und Ersatzentwürfe nach Löschung erhalten neutrale Start-/Treffpunkte, keine alten Stationscodes, Wegrätsel oder Gruppenprofile.
- Teamprofile und Stationsobjekte im erzeugten Spielplan dürfen keine veränderbaren Referenzen auf die Originalkonfiguration oder auf andere Teams behalten.

## Entscheidung 2026-11-03 – Neuanlage und lokale Projektkennungen
- Neue Projekte und nach dem Löschen des letzten Projekts erzeugte Entwürfe verwenden eine zentrale, vollständig neue Standardkonfiguration. Auch Teilnehmerzahl, Alter, Zeitansätze und Gruppeneinstellungen werden zurückgesetzt; private Treffpunkte und Codes werden niemals übernommen.
- Die lokale Projektliste darf keine doppelten Projektkennungen enthalten. Unbekannte Kennungen dürfen nicht als aktives Projekt gesetzt werden. Bei inkonsistenten Daten ist ein Fehler anzuzeigen, statt die gespeicherten Projekte stillschweigend zu überschreiben.

## Entscheidung 2026-11-03 – Stationskennungen und letzter Entwurf
- Stationen behalten ihre IDs beim Verkleinern und Wiedervergrößern der Stationszahl. Temporär ausgeblendete Stationen reservieren ihre IDs weiterhin. Neue Stationen müssen IDs erhalten, die weder sichtbare noch ausgeblendete Stationen verwenden; importierte Projekte dürfen beliebige gültige IDs enthalten.
- Beim Löschen des letzten Projekts muss ein vollständig neutraler Ersatzentwurf sofort in der lokalen Projektliste gespeichert und als aktiv gesetzt werden. Ein bloß angezeigter, ungespeicherter Ersatzentwurf genügt nicht.
- Die A5-Druckfreigabe prüft Umschlag- und Blattreihenfolge einschließlich Teilseitennummern mehrseitiger Wegrätsel. Ein vorhandener, aber noch nicht mit dem Browser verbundener Überlaufprüfbaustein gilt ausdrücklich nicht als bestandene Druckprüfung.
