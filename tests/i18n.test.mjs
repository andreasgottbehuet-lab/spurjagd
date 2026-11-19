import test from 'node:test';
import assert from 'node:assert/strict';
import { messages } from '../src/i18n.ts';

function keys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' ? keys(child, path) : [path];
  }).sort();
}

test('Alle Sprachen haben dieselben Schlüssel wie Deutsch und keine leeren Werte', () => {
  const referenceKeys = keys(messages.de);
  for (const [language, translations] of Object.entries(messages)) {
    assert.deepEqual(keys(translations), referenceKeys, `${language}: Schlüssel weichen von de ab`);
    for (const [key, value] of Object.entries(translations)) {
      if (value && typeof value === 'object') {
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          assert.equal(typeof nestedValue, 'string', `${language}.${key}.${nestedKey} muss Text sein`);
          assert.notEqual(nestedValue.trim(), '', `${language}.${key}.${nestedKey} ist leer`);
        }
      } else {
        assert.equal(typeof value, 'string', `${language}.${key} muss Text sein`);
        assert.notEqual(value.trim(), '', `${language}.${key} ist leer`);
      }
    }
  }
});
