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

test('Child packet contains separate task, answer and route sheets',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('Blatt 1/{2+routeSheetCount'));
 assert.ok(source.includes('Blatt 2/{2+routeSheetCount'));
 assert.ok(source.includes('Blatt {3+routePage}'));
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
 for(const marker of ["key={'routes-'+page}","key={'codes-'+page}","key={'clue-'+destination+'-'+page}","Spielleitung – Start und Sicherheit"]){
  assert.ok(source.includes(marker),marker);
 }
});

test('Druckvorschau nennt Aufgaben-, Spielleitungs-, Etiketten- und Gesamtseiten',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');for(const key of ['printManifest.taskSheets','printManifest.organizerSheets','printManifest.labelSheets','printManifest.minimumSheets','ORGANIZER_ITEMS_PER_A5_SHEET'])assert.ok(source.includes(key),key);});

test('Mehrseitige Wegrätsel teilen Fragen in A5-Blöcke und nummerieren weiter',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('routePuzzle.rows.slice(routePage*ROUTE_QUESTIONS_PER_A5_SHEET'));assert.ok(source.includes('routePage*ROUTE_QUESTIONS_PER_A5_SHEET+i+1'));assert.ok(source.includes('routePage===routeSheetCount(destination,config)-1'));});

test('Fragen und Antwortzeilen bleiben beim A5-Druck zusammen',()=>{const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.match(css,/\.print-route-question\s*\{[^}]*break-inside:avoid;/);assert.ok(source.includes('className="print-route-question"'));});

test('Lösungsschlüssel teilt lange Fragenrätsel in dieselben A5-Blöcke',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('clue.rows?.slice(page*ROUTE_QUESTIONS_PER_A5_SHEET'));assert.ok(source.includes("key={'clue-'+destination+'-'+page}"));});

test('Druck und Prüfcode lösen Stationsnamen mit Leerzeichen konsistent auf',()=>{const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');const audit=readFileSync(new URL('../src/print-audit.ts',import.meta.url),'utf8');assert.ok(main.includes('l.name.trim()===destination.trim()'));assert.ok(audit.includes('location.name.trim()===destination.trim()'));});

test('Druckumfang unterscheidet Umschlaganzahl und variable Kinderblattzahl',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('Umschläge mit je mindestens 3 Blättern; zusammen'));assert.ok(source.includes('{printManifest.taskSheets} Kinderblätter'));});

test('Kontrollliste verteilt Umschläge in vierer A5-Blöcken',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('ORGANIZER_ENVELOPES_PER_A5_SHEET'));assert.ok(source.includes("key={'control-'+page}"));assert.ok(source.includes('{envelope.sheetCount} Kinderblätter'));});

test('Sicherheitshinweise stehen auf eigener A5-Seite statt zwischen Packlisten',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('key="safety-check"'));assert.ok(source.includes('Spielleitung – Umschlagkontrolle'));assert.ok(source.includes('className="print-checklist-row"'));});

test('Spielleitungs-Kontrollliste enthält Code und tatsächliches Folgeziel, Kinderetiketten nicht',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');const checklist=source.slice(source.indexOf("key={'control-'+page}"),source.indexOf('{plan.value.teams.map((team,teamIndex)'));const labels=source.slice(source.indexOf('className="print-label-grid"'));assert.ok(checklist.includes('stationCodes[envelope.stationId]'));assert.ok(checklist.includes('envelope.destination'));assert.ok(checklist.includes('envelope.sheetCount'));assert.equal(labels.includes('stationCodes[envelope.stationId]'),false);assert.equal(labels.includes('envelope.destination'),false);});

test('Kontrollliste zerlegt jede Blattzahl in Aufgabe, Antwort und Wegrätsel',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('1 Aufgabe, 1 Antwort, {envelope.sheetCount-2} Wegrätsel'));});

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
 assert.equal((source.match(/className="print-sheet print-child-sheet"/g)??[]).length,3);
 assert.ok(source.includes('className="print-sheet print-label-sheet"'));
 for(const name of ['print-organizer-sheet','print-child-sheet','print-label-sheet']){
  assert.ok(source.includes("packet?.querySelectorAll('."+name+"').length"));
 }
});

test('A5-Kinderblätter tragen ihre Umschlagkennung und Blattart',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.equal((source.match(/data-envelope-id=\{teamIndex\+'-'\+location\.id\}/g)??[]).length,3);
 for(const kind of ['task','answer','route']) assert.ok(source.includes('data-sheet-kind="'+kind+'"'));
 assert.ok(source.includes('auditRenderedEnvelopes(printManifest?.envelopes??[],renderedEnvelopes)'));
 assert.ok(source.includes("sheet.dataset.envelopeId??''"));
 assert.ok(source.includes("sheet.dataset.sheetKind??''"));
});

test('A5-Etiketten besitzen eine eindeutige Umschlagkennung und werden vor Druck kontrolliert',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('className="print-label" data-envelope-id={envelope.id}'));
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

test('Default browser A5 fixture checks 12 envelopes and 36 child sheets',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('envelopeGroups.size !== 12'));
 assert.ok(script.includes('categories.children !== 36'));
 assert.ok(script.includes('categories.labels !== 3'));
});

test('Chromium acceptance checks PDF content at individual page positions',()=>{
 const script=readFileSync(new URL('../scripts/verify-a5-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('pdfPageTexts.length === expected'));
 assert.ok(script.includes("kind === 'answer' ? 'Antwortblatt'"));
 assert.ok(script.includes("kind === 'route' ? 'Wegrätsel'"));
 assert.ok(script.includes('categories.organizer + categories.children + i + 1'));
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
 assert.ok(ui.includes('Stationsangaben und Codes korrigieren'));
 assert.ok(ui.includes('onClick={()=>setActiveStep(3)}'));
});

test('Lock-code input identifies invalid values and preserves three-digit text entry',()=>{
 const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(ui.includes("aria-invalid={visitedStationIds.has(location.id) && !validCode(stationCodes[location.id]??'')}"));
 assert.ok(ui.includes("aria-describedby={'code-help-'+location.id}"));
 assert.ok(ui.includes('Bitte genau drei Ziffern eingeben; 000 und führende Nullen sind erlaubt.'));
 assert.ok(ui.includes('pattern="[0-9]{3}"'));
});

test('Organizer explains the shared age group without product-roadmap copy',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.match(source,/Alle Gruppen erhalten Aufgaben für die gemeinsam ausgewählte Altersklasse/);
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
