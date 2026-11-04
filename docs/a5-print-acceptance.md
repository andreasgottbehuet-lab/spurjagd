# A5-Druckabnahme – SPURJAGD

Status: **noch nicht physisch durchgeführt**. Diese Checkliste ist eine Arbeitsanweisung, kein Testnachweis.

## Vorbereitung
1. Im Repository `powershell -ExecutionPolicy Bypass -File scripts/verify-windows.ps1` ausführen; bei Fehlern `spurjagd-verification.log` auswerten.
2. `npm run dev` starten, die lokale URL im Browser öffnen und ein Testprojekt mit 12 Kindern, 3 Kindern je Team, 4 Stationen, 60 Minuten, 10 Minuten Rätselzeit, 5 Minuten Gehzeit und 10 Minuten Start/Finale anlegen.
3. Vier unterschiedliche dreistellige Codes festlegen, darunter `007` und `000`. Verschiedene Routen wählen. Alle Wegrätselarten einmal durchspielen; bei Ortsbeschreibungen ausreichend konkrete Merkmale eingeben.

## Druckvorschau
- Papierformat **A5 Hochformat**, Skalierung **100 %**, Browser-Kopf- und Fußzeilen deaktivieren, wenn sie den Inhalt verschieben.
- Erwartung im Beispiel: **4 Teams × 3 Stationsbesuche = 12 Umschläge × 3 Kinderblätter = 36 Kinderblätter**. Spielleitungsübersicht und Etiketten kommen hinzu. Bei 12 Umschlägen werden **3 Etikettenseiten mit je maximal 4 Etiketten** erstellt. Mit dynamisch aufgeteilten Spielleitungsseiten insgesamt **mindestens 53 A5-Seiten**; die tatsächliche Zahl kann höher sein.
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
Die Start- und Sicherheitsanweisung der Spielleitung erhält eine eigene A5-Seite. Sie darf nicht zusammen mit einer vollen vierzeiligen Umschlagkontrollliste auf ein Blatt gedrängt werden. Bei der Beispielkonfiguration (12 Umschläge, vier Teams, drei Stationen je Team) sind deshalb **14 Spielleitungsseiten** und **mindestens 53 A5-Seiten insgesamt** vorgesehen. Das Druckbild ist weiterhin manuell zu prüfen.

## Kontrollliste als Spielleitungs-Spickzettel
Auf der Umschlagkontrollliste werden je Team/Stationsbesuch neben der Kinderblattzahl auch der zugehörige dreistellige Schloss-Code und der **nächste Zielort** ausgewiesen. Die Liste bleibt ausschließlich bei der Spielleitung; Codes und Zielorte dürfen nicht auf die Kinder-Umschlagetiketten gelangen. Bei mehrfach besuchter Station muss der Code für alle Gruppen identisch sein, der nächste Zielort darf gruppenabhängig abweichen.

## Dynamische Planungshinweise
Bei Überschneidungen, gleichzeitigem Start oder anderen Warnungen erzeugt die Anwendung zusätzliche Spielleitungsseiten mit höchstens vier Hinweisen pro A5-Blatt. Die Seitenzahl wird in der Druckübersicht mitgerechnet. Bei der Abnahme eine Konfiguration mit vielen Teams prüfen und sicherstellen, dass **sämtliche** Hinweise aus der Bildschirmansicht auch auf den A5-Seiten erscheinen. Bei vier Teams ohne Stationsüberschneidungen (mit dem immer vorhandenen allgemeinen Gehzeit-Hinweis) bleibt das dokumentierte Grundbeispiel bei mindestens 53 A5-Seiten.

## Zusätzliche Druckkontrolle vor dem Browserdialog
Beim Klick auf **Drucken** zählt SPURJAGD die tatsächlich im DOM vorhandenen logischen A5-Blätter des Druckpakets und vergleicht sie mit der unabhängig berechneten Gesamtzahl des Druckmanifests. Bei fehlenden oder zusätzlichen Blatt-Elementen wird der Druckdialog nicht geöffnet und eine Fehlermeldung angezeigt. Diese Kontrolle prüft die **Anzahl der vorgesehenen Blatt-Elemente**, nicht die physische Seitenzahl im Browserdruck: Zu lange Texte, unerwartete Umbrüche und Druckerskalierung müssen weiterhin in der Druckvorschau und beim Probedruck kontrolliert werden.

## Umschlagweise Druckkontrolle
Vor dem Druck wird jetzt jeder Kinderblattseite eine Umschlagkennung und Blattart zugeordnet. Pro Umschlag sind genau ein Aufgabenblatt, ein Antwortblatt und die laut Wegrätsel-Länge erforderliche Anzahl Wegrätselblätter erforderlich. Fehlende, doppelte oder einem anderen Umschlag zugeordnete Seiten sperren den Druckdialog auch dann, wenn die Gesamtzahl aller A5-Blätter stimmt. Die tatsächlichen Papierseiten und Umbrüche müssen weiterhin in der Browser-Druckvorschau geprüft werden.

## Packreihenfolge und Etikettenzuordnung
Die Druckfreigabe prüft neben der Gesamtzahl und den Blattkategorien auch die tatsächliche Reihenfolge der Kinderblätter. Für jeden Umschlag müssen die Seiten unmittelbar aufeinanderfolgen: genau ein Aufgabenblatt, ein Antwortblatt und danach sämtliche Wegrätselblätter. Die Umschläge selbst müssen in der Reihenfolge des Druckmanifests erscheinen. Jedes Stationsetikett trägt dieselbe Umschlagkennung wie die zugehörigen Kinderblätter. Fehlende, doppelte, vertauschte und unbekannte Etiketten sperren den Druck. Auch Etiketten ohne Kennung müssen erfasst werden. Die technische Prüfung ersetzt nicht die Sichtkontrolle des physischen A5-Ausdrucks und das Einsortieren der Seiten in die richtigen Umschläge.

## Mehrseitige Wegrätsel und Seitenüberlauf
Bei mehrseitigen Wegrätseln tragen die einzelnen Kinderblätter zusätzlich eine Teilseitennummer. Die Druckkontrolle erkennt vertauschte oder doppelte Teilseitennummern auch dann, wenn die Gesamtzahl der Kinderblätter unverändert ist. Ein separater, automatisiert prüfbarer Geometriebaustein kann Breiten- und Höhenüberschreitungen anhand gemessener Blattmaße melden; dieser Baustein ist derzeit noch nicht an einen Browser-Probedruck angebunden. Daher ist die Sichtprüfung aller tatsächlich ausgegebenen A5-Seiten weiterhin erforderlich. Insbesondere lange Stationsnamen, große Textmengen und die vier Etiketten je A5-Blatt müssen geprüft werden.

## Bedruckbare A5-Fläche – geometrische Prüfung (04.11.2026)
A5-Hochformat misst 148 × 210 mm. Bei den im Stylesheet eingestellten 10 mm Seitenrändern verbleiben rechnerisch 128 × 190 mm. `auditA5PageBounds` prüft die geometrischen Blattabmessungen gegen diese Grenzen und verwirft nicht messbare Inhalte. Die Funktion ist mit synthetischen Abmessungen getestet. **Sie ist noch nicht mit einer tatsächlich aktivierten Browser-Druckdarstellung verbunden**; daher ist der geometrische Test kein Nachweis für einen fehlerfreien Ausdruck. Vor Freigabe müssen die A5-Druckvorschau und ein Probeausdruck kontrolliert werden, insbesondere lange Stationsnamen, Wegrätsel mit mehreren Seiten, Etiketten und die Spielleitungsblätter.

## Zusätzliche Manifest-Prüfungen (Entwicklungszweig 04.11.2026)
Vor dem Druck werden nun auch doppelte und leere Umschlagkennungen, Blattzahlen unter drei sowie nicht-ganzzahlige Blattzahlen abgewiesen. Die Etikettenprüfung erkennt doppelte oder leere Kennungen selbst dann, wenn die fehlerhaften Kennungen in der erwarteten Liste stehen. Die Kategorie-Sollwerte (Kinder, Spielleitung, Etiketten) müssen nichtnegative ganze Zahlen sein und in Summe exakt der Gesamtblattzahl entsprechen. Für diese Fälle wurden Regressionstests ergänzt. **Das Vorhandensein der Tests ist kein Nachweis eines erfolgreichen Testlaufs.** Der Browser-Probedruck, insbesondere physische Seitenumbrüche, ist weiterhin offen.

## Prüffall: fehlerhafte oder übergroße Manifestwerte
Die DOM-Prüfung darf bei beschädigten Manifestdaten keine unbegrenzte Seitenliste erzeugen. Ungültige Blattzahlen (NaN, Infinity, negative und nicht-ganzzahlige Werte) werden vor der Sequenzbildung abgewiesen. Bei gültigen, aber unrealistisch großen Blattzahlen wird die Sequenzbildung übersprungen, wenn die Summe nicht exakt zur Anzahl der vorhandenen Kinderblätter passt. Fehlende A5-Blattkennungen werden in der Geometrieprüfung gemeldet. Diese Schutzmaßnahmen sind im Entwicklungszweig implementiert und durch zusätzliche Testfälle beschrieben; ein erfolgreicher CI-Lauf ist noch nachzuweisen.

## Automatisierter Chromium-Probedruck (Entwicklungszweig)
`scripts/verify-a5-browser.mjs` startet die vorbereitete Webanwendung im Browser, navigiert zum Druckpaket, aktiviert die Druckdarstellung und erzeugt `verification/a5-browser-print.pdf`. Das Skript vergleicht die PDF-Seitenzahl mit der Anzahl der gerenderten A5-Blätter, kontrolliert A5-Hochformat und meldet zu große DOM-Blätter. Der Workflow installiert Chromium und `pdfinfo`, startet Vites Vorschau und archiviert PDF, Prüfbericht und Protokoll. **Noch nicht als erfolgreich ausgeführt bestätigt.** Ein echter Papierausdruck mit Druckertreiber und die Prüfung wechselnder Eingabedaten bleiben zusätzliche Abnahmepunkte. Die DOM-Höhenmessung ist ein konservativer Hinweis, keine Garantie für alle Browser-Umbrüche.

## PDF-Inhaltsprüfung
Der Chromium-Test extrahiert den Text der erzeugten PDF mit `pdftotext` und beanstandet leere Seiten sowie fehlende Kennzeichnungen für Spielleitung und Umschläge. Die Textprüfung ergänzt den Abgleich der PDF-Seitenzahl mit dem Druckmanifest. Sie ersetzt keine visuelle Prüfung von Schriftgrößen, abgeschnittenen Zeichen oder tatsächlichen Druckerrändern. Bei Fehlern werden nach Möglichkeit Screenshot, PDF und JSON-Bericht als Workflow-Artefakte bereitgestellt.
