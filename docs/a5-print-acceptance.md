# A5-Druckabnahme – SPURJAGD

Status: **noch nicht physisch durchgeführt**. Diese Checkliste ist eine Arbeitsanweisung, kein Testnachweis.

## Vorbereitung
1. Im Repository `powershell -ExecutionPolicy Bypass -File scripts/verify-windows.ps1` ausführen; bei Fehlern `spurjagd-verification.log` auswerten.
2. `npm run dev` starten, die lokale URL im Browser öffnen und ein Testprojekt mit 12 Kindern, 3 Kindern je Team, 4 Stationen, 60 Minuten, 10 Minuten Rätselzeit, 5 Minuten Gehzeit und 10 Minuten Start/Finale anlegen.
3. Vier unterschiedliche dreistellige Codes festlegen, darunter `007` und `000`. Verschiedene Routen wählen. Alle Wegrätselarten einmal durchspielen; bei Ortsbeschreibungen ausreichend konkrete Merkmale eingeben.

## Druckvorschau
- Papierformat **A5 Hochformat**, Skalierung **100 %**, Browser-Kopf- und Fußzeilen deaktivieren, wenn sie den Inhalt verschieben.
- Erwartung im Beispiel: **4 Teams × 3 Stationsbesuche = 12 Umschläge × 3 Kinderblätter = 36 Kinderblätter**. Spielleitungsübersicht und Etiketten kommen hinzu. Bei 12 Umschlägen werden **3 Etikettenseiten mit je maximal 4 Etiketten** erstellt. Mit dynamisch aufgeteilten Spielleitungsseiten insgesamt **mindestens 49 A5-Seiten**; die tatsächliche Zahl kann höher sein.
- Jeder Stationsbesuch hat Blatt 1/3 (Aufgaben), Blatt 2/3 (Antworten), Blatt 3/3 (Wegrätsel). Keine Inhalte abgeschnitten; Schrift und Schreibflächen lesbar.
- Die Kinderblätter verraten den nächsten Zielort nicht direkt. Der Ort muss durch das Rätsel ermittelt werden. Schloss-Code und Lösung dürfen nicht versehentlich im Kindertext stehen.
- Spielleitungsübersicht enthält die Codes und Lösungen; Etiketten passen zu Team, Station und Umschlag.
- Etikettenblatt: maximal vier Etiketten, alle Texte vollständig sichtbar. Der rechnerische Platzansatz beträgt 4 × 36 mm Mindesthöhe plus 3 × 3 mm Zwischenraum; die tatsächliche Druckhöhe und Zeilenumbrüche sind im Browser zu prüfen.
- Die Druckfreigabe muss auch bei vertauschten Stationen, falschen Zielorten oder veränderten Teamgrößen verweigert werden; die gedruckte Route muss dem aktuellen Spielplan entsprechen.
- Die drei Blätter eines Umschlags bleiben getrennt von den anderen Umschlägen. Bei längeren Ortsnamen und Fragen besonders auf zusätzliche Seiten und Umbrüche achten.
- Schwarz-Weiß-Druck und tatsächliche Lesbarkeit auf einem A5-Blatt prüfen.

## Spielprobe
- Für jedes Team die komplette Stationenfolge mit den Umschlägen durchspielen; jeder Code muss am realen Schloss funktionieren.
- Bei jedem Wegrätsel muss genau der geplante nächste Ort herauskommen; unterschiedliche Teamwege dürfen keine fremden Lösungen voraussetzen.
- Start-/Zieltreffpunkt, sichere Wege, Querungen, Aufsicht und Materialeinsammlung vor Ort festlegen.

## Abnahmeprotokoll
- Datum / Prüfer:
- Windows-Version / Node-Version:
- Browser / Version:
- Drucker / Treiber / Skalierung:
- Anzahl erwarteter / tatsächlich gedruckter Seiten:
- Tests: bestanden / nicht bestanden; Protokoll:
- A5-Druck: bestanden / nicht bestanden; Fehler:
- Spielprobe: bestanden / nicht bestanden; Fehler:
- Entscheidung: Freigabe / Nacharbeit erforderlich

Erst nach dokumentiertem Prüfergebnis kann dieser Punkt als abgeschlossen gelten.

## Spielleitungsübersicht
Die vier A5-Abschnitte sind Gruppen und Routen, Codes und Lösungen, Wegrätsel-Lösungen sowie Ausgabe- und Sicherheitskontrolle. Die Gruppenwege werden auf Blatt 1 geführt und nicht erneut abgedruckt. Bei vielen Teams oder langen Texten auf zusätzliche physische Druckseiten achten; der Manifestwert ist weiterhin ein rechnerischer Mindestumfang.

## Dynamische Spielleitungsseiten
Gruppenrouten und Code-Lösungen werden in Zweiergruppen auf A5 verteilt. Jedes unterschiedliche Zielrätsel erhält eine eigene Lösungsseite. Dazu kommt eine Kontroll- und Sicherheitsseite. Die rechnerische Mindestseitenzahl ist vor dem Druck mit der Browser-Druckvorschau abzugleichen; sehr lange Texte können weitere physische Seiten erzeugen.
