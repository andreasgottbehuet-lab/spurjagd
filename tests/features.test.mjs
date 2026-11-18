import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FEATURES, isPremiumFeature } from '../src/features.ts';

test('feature classification keeps premium options available and labels only their UI entry points', () => {
  for (const feature of ['themes', 'a4Printing', 'teamDifficulty', 'subjectSelection']) {
    assert.equal(isPremiumFeature(feature), true);
  }
  for (const feature of ['planning', 'puzzles', 'a5Printing']) assert.equal(isPremiumFeature(feature), false);
  assert.equal(Object.values(FEATURES).filter(value => value === 'premium').length, 4);
  const ui = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
  for (const feature of ['teamDifficulty', 'subjectSelection', 'a4Printing']) {
    assert.match(ui, new RegExp(`isPremiumFeature\\('${feature}'\\).*?Premium \\(bald\\)`));
  }
  assert.match(ui, /checked=\{subjects\.includes\(s\)\}/);
  assert.match(ui, /checked=\{Object\.keys\(teamProfiles\)\.length>0\}/);
});
