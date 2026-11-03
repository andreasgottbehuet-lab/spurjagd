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
 for(const marker of ["key={'routes-'+page}","key={'codes-'+page}","key={'clue-'+destination}","Spielleitung – Kontrolle"]){
  assert.ok(source.includes(marker),marker);
 }
});

test('Druckvorschau nennt Aufgaben-, Spielleitungs-, Etiketten- und Gesamtseiten',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');for(const key of ['printManifest.taskSheets','printManifest.organizerSheets','printManifest.labelSheets','printManifest.minimumSheets','ORGANIZER_ITEMS_PER_A5_SHEET'])assert.ok(source.includes(key),key);});

test('Mehrseitige Wegrätsel teilen Fragen in A5-Blöcke und nummerieren weiter',()=>{const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');assert.ok(source.includes('routePuzzle.rows.slice(routePage*ROUTE_QUESTIONS_PER_A5_SHEET'));assert.ok(source.includes('routePage*ROUTE_QUESTIONS_PER_A5_SHEET+i+1'));assert.ok(source.includes('routePage===routeSheetCount(destination,config)-1'));});
