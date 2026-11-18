import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyDocumentLanguage} from '../src/i18n.ts';
import {messages} from '../src/i18n.ts';

test('Dokumentsprache folgt der gewählten Oberflächensprache',()=>{
  const root={lang:'de'};
  applyDocumentLanguage(root,'en');
  assert.equal(root.lang,'en');
  applyDocumentLanguage(root,'de');
  assert.equal(root.lang,'de');
  applyDocumentLanguage(root,'fr');
  assert.equal(root.lang,'fr');
});

test('französischer Kern der Hauptoberfläche enthält keine deutschen Texte',()=>{
  const fr=messages.fr;
  for(const key of ['tagline','intro','plan','age','children','size','duration','locations','outcome','locks','word','cards','route','teams','hints','print','note','siteName','subjects','subjectsHint','privacy']) {
    assert.ok(fr[key].length>0,`fr.${key} fehlt`);
    assert.doesNotMatch(fr[key],/\b(Dein|deine|Alter|Kinder|Teilnehmende|Spiel|Standort|Druck|Geheimes)\b/i,`deutscher Rest in fr.${key}`);
  }
});

test('App setzt document.documentElement.lang bei jeder Sprachänderung',()=>{
  const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  assert.ok(source.includes('useEffect(()=>{ applyDocumentLanguage(document.documentElement, lang); },[lang]);'));
  assert.ok(source.includes('<option value="fr">FR</option>'));
});
