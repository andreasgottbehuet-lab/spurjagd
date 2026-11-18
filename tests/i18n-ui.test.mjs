import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
const pairs=[...source.matchAll(/\btx\(\s*(['"])((?:(?!\1)[^\\]|\\.)*)\1\s*,\s*(['"])((?:(?!\3)[^\\]|\\.)*)\3\s*\)/g)].map(m=>({de:m[2],en:m[4]}));
const GERMAN_WORDS=/\b(und|nicht|bitte|der|die|das|ein|eine|mit|für|von|zum|zur|ist|wird|wurde|Projekt|Speichern|Löschen|fehlgeschlagen|gesperrt)\b/i;
const ENGLISH_WORDS=/\b(the|and|not|please|with|for|of|is|failed|blocked|project|delete|export)\b/i;

test('Der Spielhinweis verwendet einfache, verständliche Formulierungen',async()=>{
  const {messages}=await import('../src/i18n.ts');
  assert.equal(messages.de.note,'Rätsel und Blätter zum Ausdrucken können erstellt werden. Bitte prüfe die Wege, begleite die Gruppe und kontrolliere die Zahlenschlösser vor dem Spiel.');
  assert.equal(messages.en.note,'Puzzles and printable sheets can be created. Please check the routes, supervise the group and check the combination locks before playing.');
  assert.doesNotMatch(messages.de.note,/Druckpaket|Schloss-Code/);
});

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

test('Projekt-/Speicheransicht zeigt im englischen Modus keinen deutschen Resttext',async()=>{
  const {storageErrorText,STORAGE_ERRORS_EN}=await import('../src/storage-messages.ts');
  const storage=await import('../src/project-storage.ts');
  const {createDefaultGameConfig}=await import('../src/default-game.ts');
  const noGerman=(text)=>{
    assert.equal(/[äöüß]/i.test(text),false,'Deutsche Zeichen im englischen Text: '+text);
    assert.equal(GERMAN_WORDS.test(text),false,'Deutsches Wort im englischen Text: '+text);
  };
  // Jede in project-storage.ts geworfene Meldung hat eine englische Fassung.
  const storageSource=readFileSync(new URL('../src/project-storage.ts',import.meta.url),'utf8');
  const thrown=[...storageSource.matchAll(/throw new Error\('((?:[^'\\]|\\.)*)'\)/g)].map(m=>m[1]);
  assert.ok(thrown.length>=15,'zu wenige Meldungen: '+thrown.length);
  for(const de of thrown)assert.ok(STORAGE_ERRORS_EN[de],'Übersetzung fehlt: '+de);
  // Echte Fehler der Speicherfunktionen auslösen.
  const memory=new Map();
  const old=globalThis.localStorage;
  globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
  const project=(id,updatedAt='2026-11-02T20:00:00.000Z')=>({version:1,id,title:'Test',updatedAt,config:createDefaultGameConfig()});
  const errors=[];
  const capture=(fn)=>{try{fn();assert.fail('kein Fehler ausgelöst');}catch(e){errors.push(e);}};
  try{
    capture(()=>storage.parseGameBackup('x'.repeat(200_001)));
    capture(()=>storage.parseGameBackup('{invalid'));
    capture(()=>storage.parseGameBackup('{"format":"anderes"}'));
    capture(()=>storage.parseGameBackup('{"format":"spurjagd-backup-1","project":{}}'));
    capture(()=>storage.serializeGameBackup({}));
    memory.set('spurjagd-projects-v1','');capture(()=>storage.loadGames());
    memory.set('spurjagd-projects-v1','{x');capture(()=>storage.loadGames());
    memory.set('spurjagd-projects-v1','{}');capture(()=>storage.loadGames());
    memory.set('spurjagd-projects-v1',JSON.stringify([project('a'),project('a')]));capture(()=>storage.loadGames());
    memory.clear();
    capture(()=>storage.saveGame({}));
    storage.saveGame(project('a'));
    capture(()=>storage.saveGame(project('a','2026-11-03T20:00:00.000Z'),'1999-01-01T00:00:00.000Z'));
    capture(()=>storage.deleteGame('a','1999-01-01T00:00:00.000Z'));
    capture(()=>storage.deleteGame('fehlt'));
    capture(()=>storage.replaceLastGame('a',{}));
    capture(()=>storage.replaceLastGame('fehlt',project('b')));
    capture(()=>storage.replaceLastGame('a',project('b'),'1999-01-01T00:00:00.000Z'));
    capture(()=>storage.setActiveGameId('fehlt'));
  }finally{globalThis.localStorage=old;}
  errors.push(
    new Error('Unerwarteter Fehler: Daten konnten nicht gelesen werden.'),
    'Speicher ist voll',
    new Error('QuotaExceededError: storage quota exceeded'),
    new Error('Datei konnte nicht geöffnet werden.'),
    new Error('Daten konnten nicht gelesen werden.'),
    new Error('Fehler beim Importieren'),
  );
  // Gesamtmeldungen so zusammensetzen, wie main.tsx sie im englischen Modus anzeigt.
  const calls=source.split('\n').filter(line=>line.includes('setStorageMessage(')&&line.includes('storageError('));
  assert.ok(calls.length>=9,'zu wenige Fehlermeldungen in der Ansicht: '+calls.length);
  for(const line of calls){
    const segment=line.slice(line.indexOf('setStorageMessage('));
    const parts=[...segment.matchAll(/\btx\(\s*(['"])((?:(?!\1)[^\\]|\\.)*)\1\s*,\s*(['"])((?:(?!\3)[^\\]|\\.)*)\3\s*\)/g)].map(m=>m[4]);
    assert.ok(parts.length>=1,'Meldung ohne tx: '+line.trim());
    for(const error of errors)noGerman(parts[0]+storageErrorText(error,true)+parts.slice(1).join(''));
  }
  assert.equal(/setStorageMessage\([^\n]*String\(/.test(source),false,'String(...) in setStorageMessage ohne storageError');
  for(const error of [
    new Error('Datei konnte nicht geöffnet werden.'),
    new Error('Daten konnten nicht gelesen werden.'),
    new Error('Fehler beim Importieren'),
    new Error('Unexpected storage failure'),
  ])noGerman(storageErrorText(error,true));
  // Deutscher Modus bleibt unverändert.
  assert.equal(storageErrorText(new Error('Projekt nicht gefunden.'),false),'Error: Projekt nicht gefunden.');
});
