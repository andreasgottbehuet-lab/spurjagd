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
 assert.match(source,/Blatt 1\/3/);
 assert.match(source,/Blatt 2\/3/);
 assert.match(source,/Blatt 3\/3/);
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
