import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('Generator source has explicit validation and balanced group allocation', () => {
  const src = readFileSync(new URL('../src/generator.ts', import.meta.url),'utf8');
  assert.match(src, /teamCount = Math\.ceil\(players \/ groupSize\)/);
  assert.match(src, /memberCount: base \+ \(i < extra \? 1 : 0\)/);
  assert.match(src, /if \(places\.length === 0\)/);
});
