import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { designs, getDesign, bildPfad, iconsFuer, STANDARD_ICONS } from '../src/designs.ts';

test('Druckdesigns verweisen nur auf vorhandene Grafikdateien', () => {
  for (const design of designs.filter(item => item.id !== 'schlicht')) {
    const bilder = ['cover', 'urkunde', 'raetselrahmen', 'einladung', ...iconsFuer(design.id).map(name => `icon-${name}`)];
    for (const bild of bilder) for (const tinte of ['farbig', 'schwarzweiss']) {
      const pfad = bildPfad(design.id, bild, tinte);
      assert.ok(pfad && existsSync(new URL(`../public${pfad}`, import.meta.url)), pfad);
    }
  }
});

test('Weihnachtsdesign verwendet seine 18 Icons', () => {
  assert.equal(iconsFuer('weihnachten').length, 18);
  assert.equal(new Set(iconsFuer('weihnachten')).size, 18);
  assert.equal(iconsFuer('detektiv'), STANDARD_ICONS);
  assert.equal(getDesign('weihnachten').id, 'weihnachten');
});

test('unbekanntes Design fällt auf schlicht zurück', () => {
  assert.equal(getDesign('unbekannt').id, 'schlicht');
  assert.equal(bildPfad('unbekannt', 'cover', 'farbig'), null);
  assert.equal(bildPfad('schlicht', 'cover', 'schwarzweiss'), null);
});

test('Weltraumdesign liefert vorhandene Druckgrafiken', () => {
  assert.equal(getDesign('weltraum').id, 'weltraum');
  for (const bild of ['cover', 'urkunde', 'raetselrahmen', 'einladung']) {
    for (const tinte of ['farbig', 'schwarzweiss']) {
      const pfad = bildPfad('weltraum', bild, tinte);
      assert.ok(pfad && existsSync(new URL(`../public${pfad}`, import.meta.url)), pfad);
    }
  }
});
