import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyDocumentLanguage} from '../src/i18n.ts';

test('Dokumentsprache folgt der gewählten Oberflächensprache',()=>{
  const root={lang:'de'};
  applyDocumentLanguage(root,'en');
  assert.equal(root.lang,'en');
  applyDocumentLanguage(root,'de');
  assert.equal(root.lang,'de');
});

test('App setzt document.documentElement.lang bei jeder Sprachänderung',()=>{
  const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  assert.ok(source.includes('useEffect(()=>{ applyDocumentLanguage(document.documentElement, lang); },[lang]);'));
});
