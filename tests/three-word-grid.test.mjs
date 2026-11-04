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
