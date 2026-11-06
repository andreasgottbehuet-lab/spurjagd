import test from 'node:test';
import assert from 'node:assert/strict';
import {generateThreeDigitWordGrid} from '../src/three-word-grid.ts';
import {findDigitWords} from '../src/puzzles.ts';

test('Ein Gitter liefert genau drei Code-Ziffern in Reihenfolge von oben nach unten',()=>{
 for(const code of ['000','007','123','987','909','555','101']){
  const result=generateThreeDigitWordGrid(code,123456);
  assert.equal(result.rows.length,12);
  assert.ok(result.rows.every(row=>row.length===12));
  const found=findDigitWords(result.rows).sort((a,b)=>a.row-b.row);
  assert.equal(found.length,3);
  assert.equal(found.map(match=>match.digit).join(''),code);
 }
});
test('Drei-Zahlwort-Gitter ist für identische Eingaben reproduzierbar',()=>{
 assert.deepEqual(generateThreeDigitWordGrid('708',42),generateThreeDigitWordGrid('708',42));
 assert.throws(()=>generateThreeDigitWordGrid('07',42),/Drei Ziffern/);
});

import {readFileSync} from 'node:fs';
test('A5-Aufgabenblatt und Spielleiterlösung verwenden denselben dreistelligen Code',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.match(source,/generateThreeDigitWordGrid\(challenge\.code,hashSeed\(projectId\+'\:'\+location\.id\)\)/);
 assert.ok(source.includes('Das Zahlwort, das am weitesten oben beginnt'));
 assert.ok(source.includes('Drei Zahlwörter im gemeinsamen Suchgitter'));
 assert.ok(source.includes('Unser Code von oben nach unten: □ □ □'));
});

test('Drei-Zahlwörter-Gitter bleibt bei verschiedenen Codes und Seeds eindeutig',()=>{
 for(let n=0;n<100;n++){
  const code=String((n*7919)%1000).padStart(3,'0');
  const grid=generateThreeDigitWordGrid(code,n*104729);
  const found=findDigitWords(grid.rows).sort((a,b)=>a.row-b.row);
  assert.equal(found.length,3,'Unerwartete Zahlwörter in Code '+code+' bei Seed '+n);
  assert.equal(found.map(x=>x.digit).join(''),code);
  assert.ok(found.every((x,i)=>x.row===[1,5,9][i]));
 }
});
