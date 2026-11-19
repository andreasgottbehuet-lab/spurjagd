import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestSolutionWord} from '../src/solution-word.ts';

test('Lösungswort-Vorschlag ist aus Länge und Seed deterministisch gebildet',()=>{
 assert.equal(suggestSolutionWord(4,'seed-a'),'BALL');
 assert.equal(suggestSolutionWord(4,'seed-a'),suggestSolutionWord(4,'seed-a'));
 assert.equal(suggestSolutionWord(4,'seed-b'),'MOND');
});
