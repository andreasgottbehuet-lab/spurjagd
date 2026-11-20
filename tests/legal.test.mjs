import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { legalData } from '../src/legal-data.ts';

// Node kann .tsx nicht direkt laden; esbuild (kommt mit vite) übersetzt die Datei.
const out = await build({ entryPoints: [new URL('../src/legal.tsx', import.meta.url).pathname], bundle: true, format: 'esm', jsx: 'automatic', packages: 'external', write: false });
const code = out.outputFiles[0].text.replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')));
const { Impressum, Datenschutz, viewFromHash } = await import('data:text/javascript,' + encodeURIComponent(code));

test('viewFromHash erkennt Rechtsansichten und fällt auf die App zurück', () => {
  assert.equal(viewFromHash('#impressum'), 'impressum');
  assert.equal(viewFromHash('/app#datenschutz'), 'datenschutz');
  assert.equal(viewFromHash('#other'), 'app');
});

for (const lang of ['de', 'en']) {
  test(`Impressum und Datenschutz liefern Text (${lang})`, () => {
    globalThis.document = { documentElement: { lang } };
    const impressum = renderToStaticMarkup(createElement(Impressum));
    for (const value of Object.values(legalData)) assert.ok(impressum.includes(value));
    const datenschutz = renderToStaticMarkup(createElement(Datenschutz));
    assert.match(datenschutz, /Cloudflare/);
    assert.match(datenschutz, /localStorage/);
    if (lang === 'de') assert.match(datenschutz, /Vom Betreiber vor der Veroeffentlichung rechtlich zu pruefen\./);
    else {
      assert.match(datenschutz, /To be legally reviewed by the operator before publication\./);
      assert.doesNotMatch(datenschutz, /Vom Betreiber vor der Veroeffentlichung rechtlich zu pruefen\./);
    }
  });
}
