import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStationChallenge, codeFromPuzzles, generateDigitPuzzle, verifyDigitPuzzle, hashSeed, validCode } from '../src/puzzles.ts';

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
  assert.throws(()=>generateStationChallenge('one','12','young',4),/drei oder vier Ziffern/);
  const challenge = generateStationChallenge('one','987','older',4);
  challenge.puzzles[0].question='9 + 9 = ?';
  assert.equal(verifyDigitPuzzle(challenge.puzzles[0]),false);
  assert.throws(()=>codeFromPuzzles(challenge),/Rätselprüfung/);
});

test('Vierstellige Codes erzeugen vier deterministische, überprüfbare Rätsel', () => {
  for (const code of ['0000','0007','0070','1234','9999']) {
    for (const age of ['young','middle','older']) {
      const challenge=generateStationChallenge('station-4',code,age,4321);
      assert.equal(challenge.code,code);
      assert.equal(challenge.puzzles.length,4);
      assert.equal(codeFromPuzzles(challenge),code);
      assert.ok(challenge.puzzles.every(verifyDigitPuzzle));
      assert.deepEqual(generateStationChallenge('station-4',code,age,4321),challenge);
    }
  }
});
test('Vierstellige Eingaben erfordern explizite Stellenzahl bei validCode', () => {
  assert.equal(validCode('1234'),false);
  assert.equal(validCode('1234',4),true);
  assert.equal(validCode('0007',4),true);
  assert.equal(validCode('123',4),false);
  assert.equal(validCode('12',2),false);
  assert.equal(validCode('',0),false);
  for (const code of ['12','12345','1a34','12 4','１２３４']) {
    assert.throws(()=>generateStationChallenge('station',code,'middle',7),/drei oder vier Ziffern/);
  }
});
