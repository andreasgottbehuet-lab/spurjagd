import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
const pairs=[...source.matchAll(/\btx\(\s*(['"])((?:(?!\1)[^\\]|\\.)*)\1\s*,\s*(['"])((?:(?!\3)[^\\]|\\.)*)\3\s*\)/g)].map(m=>({de:m[2],en:m[4]}));
const GERMAN_WORDS=/\b(und|nicht|bitte|der|die|das|ein|eine|mit|für|von|zum|zur|ist|wird|wurde|Projekt|Speichern|Löschen|fehlgeschlagen|gesperrt)\b/i;
const ENGLISH_WORDS=/\b(the|and|not|please|with|for|of|is|failed|blocked|project|delete|export)\b/i;

test('tx-Paare der Bedienoberfläche enthalten pro Sprache keine Reste der anderen',()=>{
  assert.ok(pairs.length>100,'zu wenige tx-Paare gefunden: '+pairs.length);
  for(const {de,en} of pairs){
    assert.equal(/[äöüß]/i.test(en),false,'Deutsche Zeichen im englischen Text: '+en);
    assert.equal(GERMAN_WORDS.test(en),false,'Deutsches Wort im englischen Text: '+en);
    if(de.length>25) assert.equal(ENGLISH_WORDS.test(de),false,'Englisches Wort im deutschen Text: '+de);
  }
});

test('Meldungen, Fehler und Beschriftungen der Oberfläche sind zweisprachig umgestellt',()=>{
  for(const text of [
    "tx('Speichern beim Verlassen fehlgeschlagen: ', 'Saving when leaving the page failed: ')",
    "tx('Projektwechsel gesperrt: Die Projektliste wurde in einem anderen Tab verändert.', 'Project switch blocked: the project list was changed in another tab.')",
    "tx('Löschen gesperrt: Die lokale Projektliste ist nicht sicher verfügbar.', 'Delete blocked: the local project list is not safely available.')",
    "tx('Import fehlgeschlagen: ', 'Import failed: ')",
    "tx('Export fehlgeschlagen: ', 'Export failed: ')",
    "tx('Datei zu groß.', 'File too large.')",
    "tx('Sprache','Language')",
    "tx('Buchstabenspiel','Letter game')",
    "tx('A5-Druckpaket fehlt','A5 print packet is missing')",
    "tx('Altersgruppen je Team','Age groups per team')",
    'tx("Pfeilpfad-Zahlengitter","Arrow path number grid")',
    "tx('z. B. 007','e.g. 007')",
    "return teamLabel(team.name)+': '+items.length",
    "{tx('Team','Team')} {teamLabel(team.name)}",
    'issueText(issue)',
  ])assert.ok(source.includes(text),text);
  for(const text of [
    "setStorageMessage('Speichern beim Verlassen",
    "setStorageMessage('Import fehlgeschlagen",
    "setStorageMessage('Export fehlgeschlagen",
    "setStorageMessage('Löschen",
    "setStorageMessage('Projektwechsel",
    '>Ortsbeschreibung erraten<',
    'placeholder="z. B. 007"',
    '>PROTOTYP 0.3<',
    'aria-label="Spurjagd Startseite"',
  ])assert.equal(source.includes(text),false,text);
});

test('Vorabprüfungs-Meldungen aus main.tsx werden in der englischen Oberfläche übersetzt',()=>{
  const start=source.indexOf('const issueText');
  const block=source.slice(start,source.indexOf('\n  };',start));
  for(const text of ['Startort fehlt.','Zielort fehlt.','Das Druckpaket unterstützt derzeit nur Schloss-Codes.','Mindestens ein Stationsname fehlt \\(','At least one station name is missing','Ungültiger Code: ','Start location is missing.','Finish location is missing.','Invalid code: '])assert.ok(block.includes(text),text);
});

test('Planungsfehler und Hinweise aus generator.ts werden in der Oberfläche übersetzt',()=>{
  const generator=readFileSync(new URL('../src/generator.ts',import.meta.url),'utf8');
  const start=source.indexOf('const planText');
  const block=source.slice(start,source.indexOf('\n  };',start));
  const map=new Map([...block.matchAll(/^\s*'((?:[^'\\]|\\.)*)':'((?:[^'\\]|\\.)*)',$/gm)].map(m=>[m[1],m[2]]));
  const fixed=[...generator.matchAll(/(?:cautions\.push|throw new Error)\('((?:[^'\\]|\\.)*)'\)/g)].map(m=>m[1]);
  fixed.push(generator.match(/INDOOR_CAUTION = '((?:[^'\\]|\\.)*)'/)[1]);
  assert.ok(fixed.length>=20,'zu wenige Meldungen gefunden: '+fixed.length);
  for(const de of fixed){
    assert.ok(map.has(de),'Übersetzung fehlt: '+de);
    const en=map.get(de);
    assert.equal(/[äöüß]/i.test(en),false,'Deutsche Zeichen im englischen Text: '+en);
    assert.equal(GERMAN_WORDS.test(en),false,'Deutsches Wort im englischen Text: '+en);
  }
  for(const m of generator.matchAll(/checkInt\([^,]+,[^,]+,[^,]+, '([^']+)'\)/g))assert.ok(block.includes("'"+m[1]+"':'"),'Feldname fehlt: '+m[1]);
  for(const text of ['Possible crowding at stop ',': invalid value','planText(issue)','{planText(plan.error)}','<p key={i}>{planText(warning)}</p>','<p key={i}>• {planText(warning)}</p>'])assert.ok(source.includes(text),text);
});

test('Meldungen aus print-audit.ts, print-manifest-audit.ts und puzzles.ts werden im englischen Modus übersetzt',()=>{
  const start=source.indexOf('const issueText');
  const block=source.slice(start,source.indexOf('\n    return planText(issue);',start));
  const keys=new Map([...block.matchAll(/^\s*'((?:[^'\\]|\\.)*)':'((?:[^'\\]|\\.)*)',$/gm)].map(m=>[m[1],m[2]]));
  const files=['print-audit.ts','print-manifest-audit.ts','puzzles.ts'].map(f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8'));
  const literals=[];
  for(const s of files)for(const m of s.matchAll(/throw new Error\('((?:[^'\\]|\\.)*)'\)/g))literals.push(m[1]);
  for(const s of files.slice(0,2))for(const m of s.matchAll(/(?:issues|errors)\.push\((?:[a-z.]+\+)?'(?:: )?((?:[^'\\]|\\.)*)'\)/g))literals.push(m[1]);
  assert.ok(literals.length>40,'zu wenige Meldungen: '+literals.length);
  const skip=/^(Gruppenroute |Gruppenplanung |Stationsrätsel |Ungültiger dreistelliger Code|Stationscode fehlt für |Das Druckpaket unterstützt|Startort fehlt|Rätselart|[^a-zäöü]*$)/;
  let checked=0;
  for(const de of literals){
    if(skip.test(de)||/^ ?(→|\/)/.test(de)||/^[^:]*: .*\+$/.test(de))continue;
    const known=keys.has(de)||/(Stationszahl stimmt nicht\.|Station doppelt in Route\.|Nächster Zielort fehlt\.|Umschlag fehlt oder ist doppelt\.|falsche Station auf dem Umschlag\.|Umschlagkennung stimmt nicht mit der Station überein\.|falscher nächster Zielort\.|Umschlag enthält eine falsche Anzahl A5-Blätter\.|Umschlagbeschriftung stimmt nicht\.)/.test(de)||block.includes("'"+de+"'");
    assert.ok(known,'Übersetzung fehlt: '+de);
    checked++;
  }
  assert.ok(checked>30,'zu wenige geprüft: '+checked);
  for(const en of keys.values()){
    assert.equal(/[äöüß]/i.test(en),false,'Deutsche Zeichen im englischen Text: '+en);
    assert.equal(GERMAN_WORDS.test(en),false,'Deutsches Wort im englischen Text: '+en);
  }
  for(const de of keys.keys())if(de.length>25)assert.equal(ENGLISH_WORDS.test(de),false,'Englisches Wort im deutschen Text: '+de);
});
