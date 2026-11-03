import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStationChallenge, codeFromPuzzles, generateDigitPuzzle, verifyDigitPuzzle, hashSeed, validCode, generateRoutePuzzle, generateCreativeRouteClue } from '../src/puzzles.ts';

test('Alle dreistelligen Codes einschließlich führender Nullen sind rückwärts erzeugbar', () => {
  for (let n = 0; n <= 999; n++) {
    const code = String(n).padStart(3, '0');
    const result = generateStationChallenge('playground', code, 'middle', 314159);
    assert.equal(result.code, code);
    assert.equal(codeFromPuzzles(result), code);
    assert.equal(result.puzzles.length, 3);
    assert.ok(result.puzzles.every(verifyDigitPuzzle));
  }
});
test('Drei Altersgruppen und verschiedene Seeds ergeben überprüfbare Lösungen', () => {
  for (const age of ['young', 'middle', 'older']) {
    for (const seed of [0, 1, 2, 21, 123456789]) {
      for (let digit = 0; digit < 10; digit++) {
        for (const kind of ['arithmetic', 'symbols', 'cipher']) {
          const puzzle = generateDigitPuzzle(digit, kind, age, hashSeed(seed+':'+digit+':'+kind));
          assert.equal(puzzle.expectedDigit, digit);
          assert.equal(verifyDigitPuzzle(puzzle), true);
        }
      }
    }
  }
});
test('Gleicher Seed und Eingaben ergeben gleiche Rätsel', () => {
  const first = generateStationChallenge('station-3','007','older',4321);
  assert.deepEqual(generateStationChallenge('station-3','007','older',4321),first);
});
test('Manipulierte Rätsel und ungültige Codes werden abgewiesen', () => {
  assert.equal(validCode('007'),true);
  assert.equal(validCode('12'),false);
  assert.equal(validCode('1234'),false);
  assert.throws(()=>generateStationChallenge('one','12','young',4),/drei Ziffern/);
  const challenge = generateStationChallenge('one','987','older',4);
  challenge.puzzles[0].question='9 + 9 = ?';
  assert.equal(verifyDigitPuzzle(challenge.puzzles[0]),false);
  assert.throws(()=>codeFromPuzzles(challenge),/Rätselprüfung/);
});

test('Wegrätsel bleiben je Seed gleich und verraten das festgelegte Ziel nicht als Klartext',()=>{
  for(const destination of ['Spielplatz','Wiese am Wasserbassin','Feuerwehrplatz','Zuhause','Burg']){
    for(const seed of [0,1,23,1000]){
      const clue=generateRoutePuzzle(destination,seed);
      assert.equal(clue.answer,destination);
      assert.deepEqual(generateRoutePuzzle(destination,seed),clue);
      assert.notEqual(clue.question,destination);
      if(clue.kind==='reverse') assert.equal([...clue.question].reverse().join(''),destination);
      else assert.equal(clue.question.length,destination.length);
    }
  }
  assert.throws(()=>generateRoutePuzzle('  ',1),/Zielort/);
});

test('Fragenrätsel Feuerwehr ergibt exakt das Lösungswort',()=>{
 const clue=generateCreativeRouteClue('Feuerwehr','Platz neben der Feuerwehr','questions',1);
 assert.equal(clue.rows.map(r=>r.solution[r.letterIndex]).join('').toUpperCase(),'FEUERWEHR');
});
test('Beschreibung verbirgt den Zielnamen und eigene Rätsel bleiben erhalten',()=>{
 const clue=generateCreativeRouteClue('Spielplatz','Spielplatz mit großer Rutsche und Schaukeln','description',1);
 assert.equal(clue.question.toLowerCase().includes('spielplatz'),false);
 assert.match(clue.question,/Rutsche/);
 const custom=generateCreativeRouteClue('Wiese','','custom',1,'Wo wächst das Gras?');
 assert.equal(custom.question,'Wo wächst das Gras?');
 assert.throws(()=>generateCreativeRouteClue('Wiese','','description',1),/Ortsbeschreibung/);
});

test('Alle hinterlegten Fragen ergeben ihre vorgesehenen Lösungsbuchstaben',()=>{
 const alphabet='ABCDEFGHIKLMNOPRSTUVWZ';
 for(const letter of alphabet){
   const clue=generateCreativeRouteClue(letter,'','questions',123);
   assert.equal(clue.rows.length,1);
   const row=clue.rows[0];
   assert.equal(row.solution[row.letterIndex].toUpperCase(),letter);
 }
});
test('Wegrätsel für einen Zielort sind unabhängig von der Gruppe',()=>{
 const destination='Spielplatz';
 const seed=hashSeed('projekt:destination:loc-1');
 const a=generateCreativeRouteClue(destination,'Rutsche und Schaukeln','letters',seed);
 const b=generateCreativeRouteClue(destination,'Rutsche und Schaukeln','letters',seed);
 assert.deepEqual(a,b);
});
