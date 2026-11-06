import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {issueStep} from '../src/issue-navigation.ts';

test('Fehler führen in den passenden Bearbeitungsschritt',()=>{
 assert.equal(issueStep('Ungültige Teilnehmerzahl'),1);
 assert.equal(issueStep('Die Zeit reicht nicht für eine Station'),2);
 assert.equal(issueStep('Startort fehlt.'),2);
 assert.equal(issueStep('Ungültiger Code: Feuerwehr'),3);
 assert.equal(issueStep('Stations-IDs sind nicht eindeutig.'),3);
 assert.equal(issueStep('Wegrätsel ist nicht eindeutig prüfbar'),3);
 assert.equal(issueStep('Unbekannter Druckfehler'),4);
});
test('Jede Druckwarnung besitzt eine direkte Bearbeitungsaktion',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('setActiveStep(issueStep(issue))'));
 assert.ok(source.includes('preflight-issue'));
});
