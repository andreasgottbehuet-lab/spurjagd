import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { messages } from '../src/i18n.ts';
import { SUBJECTS } from '../src/question-bank.ts';

test('alle Sprachblöcke haben dieselben vollständigen Nachrichtenschlüssel', () => {
  const source = readFileSync(new URL('../src/i18n.ts', import.meta.url), 'utf8');
  assert.match(source, /export const messages\s*=/);

  const languages = Object.keys(messages);
  assert.ok(languages.includes('de'), 'de muss als Referenzsprache vorhanden sein');

  const referenceKeys = Object.keys(messages.de).sort();
  for (const language of languages) {
    const block = messages[language];
    assert.deepEqual(Object.keys(block).sort(), referenceKeys, `${language}: Nachrichtenschlüssel`);

    for (const [key, value] of Object.entries(block)) {
      if (key === 'subjectNames') {
        assert.deepEqual(Object.keys(value).sort(), Object.keys(messages.de.subjectNames).sort(), `${language}: subjectNames-Schlüssel`);
        for (const [subject, name] of Object.entries(value)) {
          assert.equal(typeof name, 'string', `${language}.subjectNames.${subject} muss ein String sein`);
          assert.ok(name.trim().length > 0, `${language}.subjectNames.${subject} darf nicht leer sein`);
        }
      } else {
        assert.equal(typeof value, 'string', `${language}.${key} muss ein String sein`);
        assert.ok(value.trim().length > 0, `${language}.${key} darf nicht leer sein`);
      }
    }
  }

  assert.deepEqual(Object.keys(messages.de.subjectNames).sort(), [...SUBJECTS].sort(), 'subjectNames muss genau die Fächer der Fragenbank enthalten');
});
