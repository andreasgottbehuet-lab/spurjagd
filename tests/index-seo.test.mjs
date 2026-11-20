import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('index.html has the requested SEO metadata and no-script text', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<link\s+rel="canonical"/g) ?? []).length, 1);
  assert.match(html, /<link rel="canonical" href="https:\/\/spurjagd\.de\/"\s*\/>/);
  const openGraph = [
    ['og:title', 'Spurjagd – Dein Weg. Dein Abenteuer.'],
    ['og:description', 'Kostenlose Schnitzeljagd zum Ausdrucken: Raetsel, Einladung und Urkunde in wenigen Minuten.'],
    ['og:type', 'website'],
    ['og:url', 'https://spurjagd.de/'],
  ];
  for (const [property, content] of openGraph) {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.equal((html.match(new RegExp(`<meta\\s+property="${escaped}"`, 'g')) ?? []).length, 1);
    assert.ok(html.includes(`<meta property="${property}" content="${content}" />`));
  }
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

test('robots.txt and sitemap.xml publish the canonical site URL', async () => {
  const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8');
  assert.equal(robots, 'User-agent: *\nAllow: /\nSitemap: https://spurjagd.de/sitemap.xml\n');

  const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  const expected = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>https://spurjagd.de/</loc></url>\n</urlset>';
  assert.equal(sitemap.replace(/\n$/, ''), expected);
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, 1);
});
