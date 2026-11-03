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
