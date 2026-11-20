import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { designs, getDesign, bildPfad } from '../src/designs.ts';

test('Druckdesigns verweisen nur auf vorhandene Grafikdateien', () => {
  const bilder = ['cover', 'urkunde', 'raetselrahmen', 'einladung', ...['fahne', 'fernglas', 'fragezeichen', 'fussabdruecke', 'karte', 'kompass', 'laterne', 'lupe', 'rucksack', 'schatztruhe', 'schluessel', 'uhr'].map(name => `icon-${name}`)];
  for (const design of designs.filter(item => item.id !== 'schlicht')) {
    for (const bild of bilder) for (const tinte of ['farbig', 'schwarzweiss']) {
      const pfad = bildPfad(design.id, bild, tinte);
      assert.ok(pfad && existsSync(new URL(`../public${pfad}`, import.meta.url)), pfad);
    }
  }
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
