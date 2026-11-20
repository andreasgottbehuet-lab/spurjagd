import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { legalData } from '../src/legal-data.ts';

// Node kann .tsx nicht direkt laden; esbuild (kommt mit vite) übersetzt die Datei.
const out = await build({ entryPoints: [new URL('../src/legal.tsx', import.meta.url).pathname], bundle: true, format: 'esm', jsx: 'automatic', packages: 'external', write: false });
const code = out.outputFiles[0].text.replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')));
const { Impressum, Datenschutz } = await import('data:text/javascript,' + encodeURIComponent(code));

for (const lang of ['de', 'en']) {
  test(`Impressum und Datenschutz liefern Text (${lang})`, () => {
    globalThis.document = { documentElement: { lang } };
    const impressum = renderToStaticMarkup(createElement(Impressum));
    for (const value of Object.values(legalData)) assert.ok(impressum.includes(value));
    const datenschutz = renderToStaticMarkup(createElement(Datenschutz));
    assert.match(datenschutz, /Cloudflare/);
    assert.match(datenschutz, /localStorage/);
    assert.match(datenschutz, /Vom Betreiber vor der Veroeffentlichung rechtlich zu pruefen\./);
  });
}
