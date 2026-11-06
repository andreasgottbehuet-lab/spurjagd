import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('A5 print packet is isolated from interactive planner elements',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/@page\s*\{\s*size:A5 portrait;/);
 assert.match(css,/\.wizard-panel\s*>\s*:not\(\.print-packet\)\s*\{\s*display:none!important;/);
 assert.match(css,/\.wizard-panel\s*>\s*\.print-packet\s*\{\s*display:block!important;/);
 assert.match(css,/\.print-sheet:last-child\s*\{\s*break-after:auto;/);
});

test('Child packet contains task and route sheets without redundant answer sheets',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('Blatt 1/{1+routeSheetCount'));
 assert.ok(source.includes('Blatt {2+routePage}'));
 assert.match(source,/printIssues\.length===0\s*&&\s*<section className="print-packet"/);
 assert.match(source,/disabled=\{printIssues\.length>0\}/);
});

test('Envelope labels use a dedicated A5 grid and page chunks',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.match(css,/\.print-label-grid\s*\{\s*display:grid;/);
 assert.match(css,/\.print-label-sheet\s+\.print-label\s*\{/);
 assert.match(source,/className="print-sheet print-label-sheet"/);
 assert.match(source,/className="print-label-grid"/);
 assert.match(source,/\.slice\(page\*LABELS_PER_A5_SHEET,\(page\+1\)\*LABELS_PER_A5_SHEET\)/);
});

test('Vier Etiketten lassen auf A5 Platz für Titel und Seitenränder',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 const labelRule=css.match(/\.print-label-sheet \.print-label\s*\{([^}]+)\}/)?.[1];
 const gridRule=css.match(/\.print-label-grid\s*\{([^}]+)\}/)?.[1];
 assert.ok(labelRule&&gridRule);
 const row=Number(labelRule.match(/min-height:(\d+)mm/)?.[1]);
 const gap=Number(gridRule.match(/gap:(\d+)mm/)?.[1]);
 const printableHeight=210-2*10;
 const reservedTitle=25;
 assert.ok(4*row+3*gap+reservedTitle<=printableHeight,'Vier Etiketten überschreiten das A5-Höhenbudget');
});

test('Spielleitung nutzt dynamische A5-Seiten für Routen, Codes und Lösungen',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 for(const marker of ["key={'routes-'+page}","key={'codes-'+page}","key={'clue-solutions-'+page}","Spielleitung – Start und Sicherheit"]){
  assert.ok(source.includes(marker),marker);
 }
});

test('Druckvorschau nennt Aufgaben-, Spielleitungs-, Etiketten- und Gesamtseiten',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');for(const key of ['printManifest.taskSheets','printManifest.organizerSheets','printManifest.labelSheets','printManifest.minimumSheets','ORGANIZER_ITEMS_PER_A5_SHEET'])assert.ok(source.includes(key),key);});

test('Mehrseitige Wegrätsel teilen Fragen in A5-Blöcke und nummerieren weiter',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('routePuzzle.rows.slice(routePage*ROUTE_QUESTIONS_PER_A5_SHEET'));assert.ok(source.includes('routePage*ROUTE_QUESTIONS_PER_A5_SHEET+i+1'));assert.ok(source.includes('routePage===routeSheetCount(destination,config)-1'));});

test('Fragen und Antwortzeilen bleiben beim A5-Druck zusammen',()=>{const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.match(css,/\.print-route-question\s*\{[^}]*break-inside:avoid;/);assert.ok(source.includes('className="print-route-question"'));});

test('Lösungsschlüssel bündelt Ziele auf kompakten A5-Blättern',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('clue.rows?.map(row=>row.solution'));assert.ok(source.includes("key={'clue-solutions-'+page}"));});

test('Druck und Prüfcode lösen Stationsnamen mit Leerzeichen konsistent auf',()=>{const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');const audit=readFileSync(new URL('../src/print-audit.ts',import.meta.url),'utf8');assert.ok(main.includes('l.name.trim()===destination.trim()'));assert.ok(audit.includes('location.name.trim()===destination.trim()'));});

test('Druckumfang unterscheidet Umschlaganzahl und variable Kinderblattzahl',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('Umschläge mit je mindestens 2 Blättern; zusammen'));assert.ok(source.includes('{printManifest.taskSheets} Kinderblätter'));});

test('Kontrollliste verteilt Umschläge in vierer A5-Blöcken',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('ORGANIZER_ENVELOPES_PER_A5_SHEET'));assert.ok(source.includes("key={'control-'+page}"));assert.ok(source.includes('{envelope.sheetCount} Kinderblätter'));});

test('Sicherheitshinweise stehen auf eigener A5-Seite statt zwischen Packlisten',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('key="safety-check"'));assert.ok(source.includes('Spielleitung – Umschlagkontrolle'));assert.ok(source.includes('className="print-checklist-row"'));});

test('Spielleitungs-Kontrollliste enthält Code und tatsächliches Folgeziel, Kinderetiketten nicht',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');const checklist=source.slice(source.indexOf("key={'control-'+page}"),source.indexOf('{plan.value.teams.map((team,teamIndex)'));const labels=source.slice(source.indexOf('className="print-label-grid"'));assert.ok(checklist.includes('stationCodes[envelope.stationId]'));assert.ok(checklist.includes('envelope.destination'));assert.ok(checklist.includes('envelope.sheetCount'));assert.equal(labels.includes('stationCodes[envelope.stationId]'),false);assert.equal(labels.includes('envelope.destination'),false);});

test('Kontrollliste zerlegt jede Blattzahl in Aufgabe und Wegrätsel',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('1 Aufgabe, {envelope.sheetCount-1} Wegrätsel'));});

test('Druckvorschau erfordert Codes nur für tatsächlich besuchte Stationen',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('const visitedStationIds = new Set('));assert.ok(source.includes("visitedStationIds.has(l.id)&&!validCode(stationCodes[l.id]"));assert.ok(source.includes("visitedStationIds.has(l.id)&&validCode(stationCodes[l.id]"));assert.ok(source.includes('Code optional.'));});

test('Alle Routenwarnungen werden auf eigene A5-Blätter verteilt',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');assert.ok(source.includes("key={'cautions-'+page}"));assert.ok(source.includes('plan.value.cautions.slice(page*ORGANIZER_CAUTIONS_PER_A5_SHEET'));assert.ok(source.includes('className="print-caution"'));assert.match(css,/\.print-caution\s*\{[^}]*break-inside:avoid;/);});

test('Keine widersprüchliche A4-Seitengröße im Druckstylesheet',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 const declarations=[...css.matchAll(/@page\s*\{([^}]*)\}/g)].map(match=>match[1]);
 assert.ok(declarations.length>0);
 assert.ok(declarations.every(value=>/size\s*:\s*A5 portrait\s*;/.test(value)));
 assert.doesNotMatch(css,/size\s*:\s*A4\b/);
});

test('Druckknopf kontrolliert tatsächliche DOM-Blattzahl vor dem Öffnen des Druckdialogs',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes("packet?.querySelectorAll('.print-sheet').length"));
 assert.ok(source.includes('auditRenderedPrintCategories({minimumSheets:printManifest?.minimumSheets??0'));
 assert.ok(source.includes("if(issues.length){window.alert(issues.join("));
 assert.ok(source.includes('window.print();'));
});

test('Alle Druckseiten werden einer der drei geprüften Blattkategorien zugeordnet',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.equal((source.match(/className="print-sheet print-organizer-sheet"/g)??[]).length,6);
 assert.equal((source.match(/className="print-sheet print-child-sheet"/g)??[]).length,2);
 assert.ok(source.includes('className="print-sheet print-label-sheet"'));
 for(const name of ['print-organizer-sheet','print-child-sheet','print-label-sheet']){
  assert.ok(source.includes("packet?.querySelectorAll('."+name+"').length"));
 }
});

test('A5-Kinderblätter tragen ihre Umschlagkennung und Blattart',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.equal((source.match(/data-envelope-id=\{teamIndex\+'-'\+location\.id\}/g)??[]).length,2);
 for(const kind of ['task','route']) assert.ok(source.includes('data-sheet-kind="'+kind+'"'));
 assert.ok(source.includes('auditRenderedEnvelopes(printManifest?.envelopes??[],renderedEnvelopes)'));
 assert.ok(source.includes("sheet.dataset.envelopeId??''"));
 assert.ok(source.includes("sheet.dataset.sheetKind??''"));
});

test('A5-Etiketten besitzen eine eindeutige Umschlagkennung und werden vor Druck kontrolliert',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('className="print-label"'));
 assert.ok(source.includes('data-envelope-id={envelope.id}'));
 assert.ok(source.includes("packet?.querySelectorAll<HTMLElement>('.print-label')"));
 assert.ok(source.includes('auditRenderedLabels(printManifest?.envelopes??[],labelIds)'));
});

test('A5 route pages expose page index for DOM print validation',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('data-route-page={routePage+1}'));
 assert.ok(source.includes('routePage:sheet.dataset.routePage?Number(sheet.dataset.routePage):undefined'));
 assert.ok(source.includes('auditRenderedEnvelopes(printManifest?.envelopes??[],renderedEnvelopes)'));
});
test('CI runs dedicated A5 checks and reproducible dependency installation',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8');
 assert.ok(workflow.includes('npm install --no-audit --no-fund'));
 assert.ok(workflow.includes('tests/print-dom-audit.test.mjs tests/print-css.test.mjs'));
 assert.ok(workflow.includes('verification/a5-print-tests.log'));
});

test('Browser A5 smoke test is connected to CI',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8');
 assert.ok(script.includes('page.pdf('));
 assert.ok(script.includes('pages !== expected'));
 assert.ok(workflow.includes('node scripts/verify-a5-browser.mjs'));
});

test('Browser PDF validation rejects blank pages and missing print content',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes("spawnSync('pdftotext'"));
 assert.ok(script.includes('blankPages.length'));
 assert.ok(script.includes("includes('Spielleitung')"));
 assert.ok(script.includes("includes('Umschlag')"));
});

test('Chromium A5 acceptance validates categories, envelopes and label order',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 for(const marker of ['categories.unknown','envelopeGroups','Incomplete A5 envelope','Incorrect A5 envelope page order','A5 child sheets are interleaved','labelIds.length !== envelopeGroups.size']){
  assert.ok(script.includes(marker),marker);
 }
});

test('Six age groups yield 18 envelopes, 36 child sheets and 5 label sheets',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('envelopeGroups.size !== 18'));
 assert.ok(script.includes('categories.children !== 36'));
 assert.ok(script.includes('categories.labels !== 5'));
});

test('Chromium acceptance checks PDF content at individual page positions',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('pdfPageTexts.length === expected'));
 assert.ok(!script.includes("kind === 'answer' ? 'Antwortblatt'"));
 assert.match(script,/kind === 'route'[^;]*'Wegrätsel'/);
 assert.ok(script.includes("'Stationsaufgaben:'"));
 assert.ok(script.includes('combinedWordGrid'));
 assert.ok(script.includes("'Aufgabe ' + number"));
 assert.ok(script.includes('categories.organizer + categories.children + i + 1'));
});

test('Chromium PDF audit compares organizer, children and labels to rendered packet',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('Gruppen und Routen'));
 assert.ok(script.includes('Codes und Lösungen'));
 assert.ok(script.includes('Umschlagkontrolle'));
 assert.ok(script.includes("page.locator('.print-child-sheet')"));
 assert.ok(script.includes('printedHeaders[index]'));
 assert.ok(script.includes("page.locator('.print-label strong')"));
 assert.ok(script.includes('expectedLabel.replace'));
 assert.ok(script.includes('childHeadersChecked: printedHeaders.length'));
 assert.ok(script.includes('teamIdentitiesChecked: printedTeams.length'));
 assert.ok(script.includes('labelTextsChecked: labelNames.length'));
 assert.ok(script.includes('Organizer-only solution or envelope checklist leaked'));
});

test('A5 PDF audit reconciles packing checklist and label descriptions',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes("page.locator('.print-checklist-row > strong')"));
 assert.ok(script.includes("page.locator('.print-label span')"));
 assert.ok(script.includes('checklistRows.length !== envelopeGroups.size'));
 assert.ok(script.includes("page.locator('.print-checklist-row > span')"));
 assert.ok(script.includes('A5 packing checklist has incorrect child sheet count'));
 assert.ok(script.includes("details.includes('Danach:')"));
 assert.ok(script.includes("details.includes('Schloss-Code:')"));
 assert.ok(script.includes('A5 packing checklist has an invalid code or destination'));
 assert.ok(script.includes('A5 organizer PDF is missing packing-list lock code'));
 assert.ok(script.includes('A5 organizer PDF is missing packing-list destination'));
 assert.ok(script.includes('labelDescriptions.length'));
 assert.ok(script.includes('A5 envelope label and organizer packing-list identity differ'));
 assert.ok(script.includes('A5 packing-list row '));
 assert.ok(script.includes('incorrect number of packing-list pages'));
 assert.ok(script.includes('labelParts[1] !== checklistParts[1]'));
 assert.ok(script.includes('labelCount[1] !== packingCount[1]'));
 assert.ok(script.includes('normalizedOrganizer.includes(part.trim())'));
 assert.ok(script.includes('printedPage.includes(expectedDescription)'));
});

test('Chromium acceptance archives visual A5 page previews',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes("spawnSync('pdftoppm'"));
 for(const name of ["['organizer', 1]","['child', categories.organizer + 1]","['labels', categories.organizer + categories.children + 1]"]) assert.ok(script.includes(name),name);
});

test('A5 CI retains evidence when the browser or preview fails early',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8');
 assert.ok(script.includes('a5-browser-error.json'));
 assert.ok(script.includes('activePage.screenshot'));
 assert.ok(workflow.includes('READY=0'));
 assert.ok(workflow.includes('Vite preview failed to start'));
 assert.ok(workflow.includes('if: always()'));
});

test('A5 workflow records browser setup log',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8');
 assert.ok(workflow.includes('a5-browser-setup.log'));
 assert.ok(workflow.includes('timeout-minutes: 30'));
});

test('A5 Chromium fixture checks leading zeroes and printable category order',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes("['007', '000', '123', '987']"));
 assert.ok(script.includes('Station code lost leading zeroes'));
 assert.ok(script.includes('printButton.isDisabled()'));
 assert.ok(script.includes('A5 sheet category order must be organizer, child, labels'));
});

test('Wizard does not offer unsupported paid game goals as printable options',()=>{
 const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.match(ui,/checked={goal==='word'} disabled/);
 assert.match(ui,/checked={goal==='cards'} disabled/);
 assert.ok(ui.includes("Auf unterstütztes Spielziel wechseln"));
});

test('Wizard exposes print errors at station entry and offers a direct correction path',()=>{
 const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(ui.includes('Noch zu erledigen, bevor das A5-Paket gedruckt werden kann:'));
 assert.ok(ui.includes('Alle Angaben für das A5-Druckpaket sind vollständig.'));
 assert.ok(ui.includes('Spielregeln und Zeit prüfen'));
 assert.ok(ui.includes('Standorte und Codes prüfen'));
 assert.ok(ui.includes('onClick={()=>setActiveStep(2)}'));
 assert.ok(ui.includes('onClick={()=>setActiveStep(3)}'));
});

test('Lock-code input identifies invalid values and preserves three-digit text entry',()=>{
 const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(ui.includes("aria-invalid={visitedStationIds.has(location.id) && !validCode(stationCodes[location.id]??'')}"));
 assert.ok(ui.includes("aria-describedby={'code-help-'+location.id}"));
 assert.ok(ui.includes('Bitte genau drei Ziffern eingeben; 000 und führende Nullen sind erlaubt.'));
 assert.ok(ui.includes('pattern="[0-9]{3}"'));
});

test('Each team carries its own labeled age group through organizer and child print pages',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const ageGroups=readFileSync(new URL('../src/age-groups.ts',import.meta.url),'utf8');
 assert.match(ageGroups,/\['4–6','6–8','8–10','10–12','12–14','14\+'\]/);
 assert.ok(source.includes('Jede Gruppe erhält Aufgaben und Wegrätsel'));
 assert.ok(source.includes('data-age-group={team.profile?.age??age}'));
 assert.ok(source.includes('Team {team.name} · {team.profile?.age??age} Jahre'));
});

test('Wizard offers explicit next-step navigation and live group summary',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 for(const label of ['Geplante Gruppen','Weiter zu den Spielregeln','Weiter zu den Standorten','Spielplan ansehen'])assert.ok(source.includes(label),label);
});

test('Standortschritt weist auf Ortsprüfung und fehlende Distanzberechnung hin',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('Die App kennt keine tatsächlichen Wegstrecken'));
 assert.ok(source.includes('Prüfe jeden Standort vor Ort'));
});

test('Große Gruppenzahlen werden in der Vorschau kompakt angezeigt',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('groupDistribution.length <= 12'));
});

test('Spielleitungs-Hinweise sind auch im sichtbaren Spielplan verfügbar',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('plan.value.cautions.map'));
 assert.ok(source.includes('Hinweise für die Spielleitung'));
});

test('Gruppenobergrenze und aktueller Produktstatus sind verständlich beschriftet',()=>{
 const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const labels=readFileSync(new URL('../src/i18n.ts',import.meta.url),'utf8');
 assert.ok(ui.includes('Die maximale Gruppengröße ist eine Obergrenze'));
 assert.ok(labels.includes('Maximale Kinder pro Team'));
 assert.ok(labels.includes('Maximum children per team'));
 assert.ok(!labels.includes('Rätsel, echte Wege und Codes werden in der nächsten Ausbaustufe ergänzt'));
});

test('Wegrätsel-Eingabe erklärt Geheimhaltung des Zielorts',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('Der Ortsname ist die Lösung des Wegrätsels'));
 assert.ok(source.includes('Route clues – preview by destination'));
});

test('Eigene Wegrätsel sind bereits im Eingabefeld auf 400 Zeichen begrenzt',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('maxLength={400} value={routeClueTexts[location.id]'));
});

test('A5 print button validates rendered packing labels against organizer rows',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('auditRenderedPackingItems('));
 assert.ok(source.includes("readPacking('.print-label')"));
 assert.ok(source.includes("readPacking('.print-checklist-row')"));
 assert.ok(source.includes('data-count={envelope.sheetCount}'));
});

test('A5 print instructions are visible on screen and absent from the physical packet',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.ok(source.includes('className="print-guidance"'));
 assert.ok(source.includes('A5 Hochformat'));
 assert.ok(source.includes('Packübersicht nach Team:'));
 assert.ok(source.includes('A5-Einzelseiten'));
 assert.ok(source.includes('Duplexdruck'));
 assert.ok(source.includes('items.reduce((sum,envelope)=>sum+envelope.sheetCount,0)'));
 assert.ok(source.includes('Schloss-Codes am echten Schloss prüfen'));
 assert.ok(css.includes('.print-guidance{display:none!important}'));
});

test('Browser checks A5 screen packing totals against actual labels',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('A5 organizer print guidance is missing'));
 assert.ok(script.includes('A5 screen packing overview does not match printed labels'));
 assert.ok(script.includes("page.locator('.print-label').evaluateAll"));
});

test('PDF keeps screen packing notes off A5 sheets',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('A5 PDF unexpectedly includes screen-only packing guidance'));
});

test('Browser actually blocks printing on wrong labels and checklist counts',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('Corrupted A5 envelope label did not block the print button'));
 assert.ok(script.includes('Corrupted A5 organizer packing count did not block printing'));
 assert.ok(script.includes('Valid A5 envelope labels did not restore the print action'));
 assert.ok(script.includes('Valid A5 organizer packing count did not restore printing'));
});

test('Browser rejects misassigned child sheets and mislabelled route pages',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('A5 child sheet with wrong envelope identity did not block printing'));
 assert.ok(script.includes('A5 route page mislabelled as answer did not block printing'));
 assert.ok(script.includes('A5 print did not recover after child envelope restoration'));
 assert.ok(script.includes('A5 print did not recover after route page kind restoration'));
 assert.ok(script.includes('Missing A5 child sheet did not block printing'));
 assert.ok(script.includes('A5 print did not recover after restoring missing child sheet'));
});

test('Browser rejects whitespace-padded packing labels and restores printing',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('Whitespace-padded A5 envelope label did not block printing'));
 assert.ok(script.includes('A5 print did not recover after correcting whitespace-padded label'));
});

test('Browser validates organizer-only lock codes and destinations before printing',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(main.includes('auditRenderedOrganizerSecrets'));
 assert.ok(main.includes('data-code={stationCodes[envelope.stationId]'));
 assert.ok(main.includes('data-destination={envelope.destination}'));
 assert.ok(script.includes('Tampered A5 organizer'));
 assert.ok(script.includes('Corrected A5 organizer'));
});

test('Browser print gate checks organizer lock codes and next destinations',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('Incorrect organizer-only lock code did not block printing'));
 assert.ok(script.includes('Incorrect organizer next destination did not block printing'));
 assert.ok(script.includes('A5 print did not recover after organizer code correction'));
 assert.ok(script.includes('A5 print did not recover after organizer destination correction'));
});

test('PDF verification binds organizer codes and destinations to the correct A5 checklist page',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('A5 packing-list code '));
 assert.ok(script.includes('A5 packing-list destination '));
 assert.ok(script.includes("printedPage.includes('Schloss-Code: ' + code)"));
 assert.ok(script.includes("printedPage.includes('Danach: ' + destination)"));
});

test('Organizer packing preview is screen-only and verified in Chromium',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(css.includes('@media print{.packing-preview{display:none!important}}'));
 assert.ok(app.includes('className="packing-preview"'));
 assert.ok(app.includes('printManifest.envelopes.filter(envelope=>envelope.team===team.name)'));
 assert.ok(browser.includes('Organizer packing preview does not list all 12 envelopes'));
 assert.ok(browser.includes('A5 PDF unexpectedly includes organizer-only on-screen packing preview'));
});

test('A5 preflight explains readiness and offers corrections for rules and station codes',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.ok(source.includes('preflight-status preflight-blocked'));
 assert.ok(source.includes('preflight-status preflight-ready'));
 assert.ok(source.includes("tx('Druck noch gesperrt'"));
 assert.ok(source.includes("tx('Druckpaket bereit'"));
 assert.ok(source.includes("onClick={()=>setActiveStep(2)}"));
 assert.ok(source.includes("onClick={()=>setActiveStep(3)}"));
 assert.match(css,/\.preflight-status\s*\{/);
 assert.match(css,/@media print\s*\{\.preflight-status,\.preflight-actions\{display:none!important\}\}/);
});

test('Full A5 browser test explicitly verifies varied routes and persisted route choice',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes("if (step === 1)"));
 assert.ok(script.includes("selectOption('varied')"));
 assert.ok(script.includes('Different group routes were lost after reload'));
 assert.ok(script.includes('routeSequences.length !== 6'));
 assert.ok(script.includes('new Set(routeSequences).size < 2'));
});

test('Packed A5 PDF has a fixed physical content width and source packet is hidden',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/\.print-packet\.print-packet-source\s*\{\s*display:none!important;/);
 assert.match(css,/\.print-packet-packed\s*>\s*\.print-packed-page\.print-sheet\s*\{width:127mm!important;/);
 assert.match(css,/\.print-packet-packed\s*>\s*\.print-packed-page:last-child\s*\{[\s\S]*?break-after:auto!important;/);
});

test('A5 preflight measures the same packed task geometry used for printing',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.match(css,/Apply the same packed task geometry during screen preflight and printing\.\s*\*\/\s*@media screen, print/);
 assert.match(css,/The A5 content width must match in preflight and PDF pagination\.\s*\*\/\s*@media screen, print/);
 assert.match(source,/const \{manifest:physical\}=buildPackedA5PrintCopy\(packet\)/);
});

test('Print action rejects overflowing packed content using the same 190 mm budget as Chromium',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const verifier=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.match(source,/sheet\.scrollHeight\*25\.4\/96/);
 assert.match(source,/Math\.max\(height,content\)>A5_USABLE_HEIGHT_MM\+0\.01/);
 assert.match(verifier,/sheet\.heightMm>190\.01 \|\| sheet\.scrollHeightMm>190\.01/);
});

test('Source A5 task cards retain legible type while reducing excess vertical spacing',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/\.print-child-sheet\[data-sheet-kind="task"\] \.print-task\{padding:1\.5mm 3mm;margin:1mm 0;line-height:1\.15;font-size:9pt\}/);
 assert.match(css,/\.print-child-sheet\[data-sheet-kind="task"\] \.print-task \.print-question\{font-size:11pt/);
});

test('A5 print gate and Chromium PDF both reject content exceeding 128 mm width',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const verifier=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.match(source,/Math\.max\(sheet\.getBoundingClientRect\(\)\.width,sheet\.scrollWidth\)\*25\.4\/96/);
 assert.match(source,/width>128\.01/);
 assert.match(verifier,/scrollWidthMm:Math\.round\(el\.scrollWidth\*25\.4\/96\*100\)\/100/);
 assert.match(verifier,/sheet\.widthMm>128\.01 \|\| sheet\.scrollWidthMm>128\.01/);
});

test('Packed A5 pages reserve fractional CSS pixel space below the strict 128 mm width gate',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/\.print-packet-packed > \.print-packed-page.print-sheet {width:127mm!important;max-width:127mm!important/);
});

test('Packed A5 preflight includes the same wrapper flow and separator as print',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/@media screen\s*\{\s*\.print-packet-packed \.print-packed-content \{display:flow-root;\}\s*\.print-packet-packed \.print-packed-content \+ \.print-packed-content \{margin-top:2mm;\}/);
});

test('Chromium print acceptance exports eight separate A5 packets only after the combined proof passes',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 const gate=script.indexOf('if (failures.length) {');
 const exportAt=script.indexOf('const pdfSpecs=[');
 assert.ok(gate>=0&&exportAt>gate);
 assert.ok(script.includes("'pdfunite'"));
 assert.ok(script.includes("'pdfseparate'"));
 for(const name of ['SPURJAGD_Spielleitung_A5.pdf','SPURJAGD_Team_Rot_A5.pdf','SPURJAGD_Team_Blau_A5.pdf','SPURJAGD_Team_Gruen_A5.pdf','SPURJAGD_Team_Gelb_A5.pdf','SPURJAGD_Team_Orange_A5.pdf','SPURJAGD_Team_Lila_A5.pdf','SPURJAGD_Umschlagetiketten_A5.pdf'])assert.ok(script.includes(name));
});

test('Verdichtete Kinderblätter halten Symbol- und Pfeilgitter innerhalb der A5-Druckfläche',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/\.print-packet-packed\s*>\s*\.print-child-sheet\[data-sheet-kind="task"\][\s\S]*?font-size:8\.2pt;line-height:1\.02/);
 assert.match(css,/\.print-packet-packed\s*>\s*\.print-child-sheet\[data-sheet-kind="task"\][\s\S]*?\.arrow-grid \.wordsearch-cell\{width:6mm;height:6mm/);
 assert.match(css,/\.print-packet-packed\s*>\s*\.print-child-sheet\[data-sheet-kind="task"\][\s\S]*?\.symbol-grid \.symbol-cell\{width:7mm;height:7mm/);
});
