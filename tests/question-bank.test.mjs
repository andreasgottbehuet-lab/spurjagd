import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_BANK,SUBJECTS} from '../src/question-bank.ts';

test('Fragenbank: 24 Fragen, alle Fächer, keine Dubletten',()=>{
 assert.equal(QUESTION_BANK.length,24);
 assert.equal(new Set(QUESTION_BANK.map(x=>x.frage)).size,QUESTION_BANK.length);
 for(const f of SUBJECTS) assert.ok(QUESTION_BANK.filter(x=>x.fach===f).length>=3,f);
 for(const x of QUESTION_BANK) assert.ok(['older','advanced'].includes(x.altersstufe));
});
test('Fragenbank: letterIndex liegt in der Lösung',()=>{
 for(const x of QUESTION_BANK){
  assert.ok(Number.isInteger(x.letterIndex)&&x.letterIndex>=0&&x.letterIndex<x.loesung.length,x.frage);
  assert.match(x.loesung[x.letterIndex],/\p{L}/u,x.frage);
 }
});
