import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('index.html has the requested SEO metadata and no-script text', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<link\s+rel="canonical"/g) ?? []).length, 1);
  assert.match(html, /<link rel="canonical" href="https:\/\/spurjagd\.de\/"\s*\/>/);
  const description = html.match(/<meta name="description" content="([^"]+)"\s*\/>/)?.[1];
  assert.ok(description);
  assert.ok(description.length >= 110 && description.length <= 155, `description length: ${description.length}`);
  for (const term of ['Schnitzeljagd', 'Rätseln', 'Ausdrucken', 'kostenlos']) assert.ok(description.includes(term));
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(jsonLd);
  const data = JSON.parse(jsonLd);
  assert.equal(data['@type'], 'WebApplication');
  assert.equal(data.name, 'Spurjagd');
  assert.equal(data.url, 'https://spurjagd.de/');
  assert.equal(data.applicationCategory, 'GameApplication');
  assert.deepEqual(data.inLanguage, ['de', 'en', 'fr']);
  assert.deepEqual(data.offers, { '@type': 'Offer', price: 0, priceCurrency: 'EUR' });
  assert.match(html, /<noscript>[\s\S]*?<h1>Spurjagd – Schnitzeljagd selbst gestalten und ausdrucken<\/h1>[\s\S]*?<\/noscript>/);
});
