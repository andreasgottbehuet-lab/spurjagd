import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

describe('Urkundenmotiv', () => {
  it('has a printable explorer image below 250 KB and German and English alt text', async () => {
    const imagePath = new URL('../public/grafik/entdecker/urkunde_farbig.webp', import.meta.url);
    const image = await stat(imagePath);
    assert.ok(image.size < 250 * 1024);

    const source = await readFile(new URL('../src/i18n.ts', import.meta.url), 'utf8');
    assert.match(source, /de:\s*\{[\s\S]*?certificateImageAlt:/);
    assert.match(source, /en:\s*\{[\s\S]*?certificateImageAlt:/);
  });
});
