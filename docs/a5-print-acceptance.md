# A5-Druckabnahme – SPURJAGD

Status: **noch nicht physisch durchgeführt**. Diese Checkliste ist eine Arbeitsanweisung, kein Testnachweis.

## Vorbereitung
1. Im Repository `powershell -ExecutionPolicy Bypass -File scripts/verify-windows.ps1` ausführen; bei Fehlern `spurjagd-verification.log` auswerten.
2. `npm run dev` starten, die lokale URL im Browser öffnen und ein Testprojekt mit 12 Kindern, 3 Kindern je Team, 4 Stationen, 60 Minuten, 10 Minuten Rätselzeit, 5 Minuten Gehzeit und 10 Minuten Start/Finale anlegen.
3. Vier unterschiedliche dreistellige Codes festlegen, darunter `007` und `000`. Verschiedene Routen wählen. Alle Wegrätselarten einmal durchspielen; bei Ortsbeschreibungen ausreichend konkrete Merkmale eingeben.

## Druckvorschau
- Papierformat **A5 Hochformat**, Skalierung **100 %**, Browser-Kopf- und Fußzeilen deaktivieren, wenn sie den Inhalt verschieben.
- Erwartung im Beispiel: **4 Teams × 3 Stationsbesuche = 12 Umschläge × 3 Kinderblätter = 36 Kinderblätter**. Spielleitungsübersicht und Etiketten kommen hinzu. Bei 12 Umschlägen werden **3 Etikettenseiten mit je maximal 4 Etiketten** erstellt. Mit dynamisch aufgeteilten Spielleitungsseiten insgesamt **mindestens 52 A5-Seiten**; die tatsächliche Zahl kann höher sein.
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

## Dynamische Spielleitungsseiten
Gruppenrouten und Code-Lösungen werden in Zweiergruppen auf A5 verteilt. Jedes unterschiedliche Zielrätsel erhält eine eigene Lösungsseite. Dazu kommt eine Kontroll- und Sicherheitsseite. Die rechnerische Mindestseitenzahl ist vor dem Druck mit der Browser-Druckvorschau abzugleichen; sehr lange Texte können weitere physische Seiten erzeugen.

## Mehrseitige Kinder-Wegrätsel
Bei Fragenrätseln werden höchstens fünf Fragen auf einem A5-Blatt dargestellt. Weitere Fragen folgen auf nummerierten Fortsetzungsblättern; das Antwortfeld für den nächsten Ort steht auf dem letzten Blatt. Der Umschlag enthält zwei feste Blätter (Aufgaben und Antworten) sowie die erforderlichen Wegrätselblätter. Druckvorschau und Etikettenzahl auf Übereinstimmung prüfen. Bei besonders langen Fragen und Ortsnamen ist ein realer A5-Probedruck weiterhin erforderlich.

## Spielleitungs-Lösungsblätter bei langen Ortsnamen
Fragenrätsel mit mehr als fünf Lösungsbuchstaben erhalten auch in der Spielleitungsübersicht Fortsetzungsblätter. Die Nummerierung und die Seitenzahl müssen mit den Kinder-Wegrätselblättern übereinstimmen. Bei der Druckabnahme für einen langen Zielort sowohl die Kinderseiten als auch die Lösungsseiten kontrollieren.

## Abgleich Umschläge und Gruppenrouten
Bei mehr als zwei Gruppen liegen mehrere Gruppenroutenseiten vor. Für jeden Umschlag Team, Stationsnummer, Stationsname und die ausgewiesene Blattzahl gegen die zugehörige Gruppenroutenseite und das Etikett prüfen. Bei einem Zielwort mit 26 Buchstaben und Fragenmodus entstehen sechs Wegrätselblätter; je Umschlag sind dann insgesamt acht Kinderblätter vorgesehen.

## Umschlag-Kontrollliste
Die Spielleitung erhält eine abhakbare Liste mit höchstens vier Umschlägen pro A5-Blatt. Bei zwölf Umschlägen sind drei Kontrollseiten vorgesehen. Für jeden Eintrag Team, Stationsnummer, Stationsname und benötigte Kinderblattzahl mit dem tatsächlich gepackten Umschlag abgleichen.

## Eigenständiges Sicherheitsblatt
Die Start- und Sicherheitsanweisung der Spielleitung erhält eine eigene A5-Seite. Sie darf nicht zusammen mit einer vollen vierzeiligen Umschlagkontrollliste auf ein Blatt gedrängt werden. Bei der Beispielkonfiguration (12 Umschläge, vier Teams, drei Stationen je Team) sind deshalb **13 Spielleitungsseiten** und **mindestens 52 A5-Seiten insgesamt** vorgesehen. Das Druckbild ist weiterhin manuell zu prüfen.

## Kontrollliste als Spielleitungs-Spickzettel
Auf der Umschlagkontrollliste werden je Team/Stationsbesuch neben der Kinderblattzahl auch der zugehörige dreistellige Schloss-Code und der **nächste Zielort** ausgewiesen. Die Liste bleibt ausschließlich bei der Spielleitung; Codes und Zielorte dürfen nicht auf die Kinder-Umschlagetiketten gelangen. Bei mehrfach besuchter Station muss der Code für alle Gruppen identisch sein, der nächste Zielort darf gruppenabhängig abweichen.

## Dynamische Planungshinweise
Bei Überschneidungen, gleichzeitigem Start oder anderen Warnungen erzeugt die Anwendung zusätzliche Spielleitungsseiten mit höchstens vier Hinweisen pro A5-Blatt. Die Seitenzahl wird in der Druckübersicht mitgerechnet. Bei der Abnahme eine Konfiguration mit vielen Teams prüfen und sicherstellen, dass **sämtliche** Hinweise aus der Bildschirmansicht auch auf den A5-Seiten erscheinen. Bei vier Teams ohne zusätzliche Planungshinweise bleibt das dokumentierte Grundbeispiel bei mindestens 52 A5-Seiten.
