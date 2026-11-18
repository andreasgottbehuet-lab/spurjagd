import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_BANK,SUBJECTS} from '../src/question-bank.ts';
import {generateCreativeRouteClue,verifyCreativeRouteClue} from '../src/puzzles.ts';

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
test('Fragenrätsel ab older nutzt Bankfragen, Fächerfilter und Rückfall',()=>{
 const bank=new Map(QUESTION_BANK.map(x=>[x.frage,x]));
 const clue=generateCreativeRouteClue('Bu','','questions',5,'','older');
 assert.ok(verifyCreativeRouteClue(clue));
 assert.ok(clue.rows.some(r=>bank.get(r.question)?.altersstufe==='older'));
 const erd=generateCreativeRouteClue('Bu','','questions',5,'','older',['Erdkunde']);
 assert.ok(verifyCreativeRouteClue(erd));
 assert.equal(erd.rows[0].question,'Wie heißt die Hauptstadt von Deutschland?');
 const none=generateCreativeRouteClue('Bu','','questions',5,'','older',[]);
 assert.ok(verifyCreativeRouteClue(none));
 assert.ok(none.rows.every(r=>!bank.has(r.question)));
 const middle=generateCreativeRouteClue('Bu','','questions',5,'','middle');
 assert.ok(middle.rows.every(r=>!bank.has(r.question)));
 assert.deepEqual(generateCreativeRouteClue('Bu','','questions',5,'','older'),clue);
});
