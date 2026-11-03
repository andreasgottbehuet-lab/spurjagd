import test from 'node:test';
import assert from 'node:assert/strict';
import { isGameConfig, isSavedGame, parseGameBackup, serializeGameBackup, saveGame, loadGames, deleteGame } from '../src/project-storage.ts';

const sample = () => ({
  version:1,
  id:'test-one',
  title:'Geburtstag',
  updatedAt:'2026-11-02T20:00:00.000Z',
  config:{
    players:12,groupSize:3,durationMinutes:60,age:'8–10',goal:'locks',
    locations:[{id:'1',name:'Spielplatz',description:'Schaukel'}],
    puzzleMinutes:10,walkingMinutes:5,startFinishMinutes:10,
    startMode:'shared',routeMode:'same',finishMode:'meeting',meetingPoint:'Zuhause'
  }
});
test('Sichere Backup-Rundreise', () => {
  const original = sample();
  assert.ok(isSavedGame(original));
  assert.deepEqual(parseGameBackup(serializeGameBackup(original)),original);
});
test('Ungültige und falsche Backups werden abgewiesen',()=>{
  assert.throws(()=>parseGameBackup('{"format":"anderes","project":{}}'),/Kein Spurjagd/);
  assert.throws(()=>parseGameBackup('{"format":"spurjagd-backup-1","project":{"version":1}}'),/Ungültige/);
  assert.throws(()=>parseGameBackup('x'.repeat(200_001)),/zu groß/);
});
test('Routendaten und Standorte werden überprüft',()=>{
  assert.equal(isGameConfig({...sample().config,routeMode:'random'}),false);
  assert.equal(isGameConfig({...sample().config,locations:[{id:'1',name:'',description:''}]}),true);
  assert.equal(isGameConfig({...sample().config,locations:[{id:'1',name:'Wiese',description:''},{id:'1',name:'Wald',description:''}]}),false);
  assert.equal(isGameConfig(sample().config),true);
});
test('Mehrere Entwürfe lassen sich speichern, überschreiben und entfernen',()=>{
  const memory = new Map();
  const old = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: k => memory.get(k) ?? null,
    setItem: (k,v) => memory.set(k,String(v)),
    removeItem: k => memory.delete(k),
  };
  try{
    saveGame(sample());
    saveGame({...sample(),id:'test-two',title:'Zweite Jagd'});
    assert.equal(loadGames().length,2);
    saveGame({...sample(),id:'test-one',title:'Neue Überschrift'});
    assert.equal(loadGames().length,2);
    assert.equal(loadGames().find(x=>x.id==='test-one')?.title,'Neue Überschrift');
    deleteGame('test-one');
    assert.deepEqual(loadGames().map(x=>x.id),['test-two']);
  } finally {
    if (old === undefined) delete globalThis.localStorage;
    else globalThis.localStorage=old;
  }
});

test('Unvollständige Codes und unbenannte Stationen bleiben als Entwurf speicherbar',()=>{
  const draft=sample();
  draft.config.locations=[{id:'1',name:'',description:''},{id:'2',name:'',description:''}];
  draft.config.stationCodes={'1':'00','2':''};
  assert.equal(isGameConfig(draft.config),true);
  assert.deepEqual(parseGameBackup(serializeGameBackup(draft)),draft);
  draft.config.stationCodes={'1':'1234'};
  assert.equal(isGameConfig(draft.config),false);
});
test('Vorhandene Backups ohne neue Felder bleiben gültig',()=>{
  const previous=sample();
  assert.equal(isGameConfig(previous.config),true);
  assert.deepEqual(parseGameBackup(serializeGameBackup(previous)),previous);
});

test('Teamprofile mit numerischen Gruppenkennungen lassen sich sichern und wieder laden',()=>{
 const game=sample();
 game.config.teamProfiles={'0':{age:'8–10',difficulty:'normal'},'12':{age:'10–12',difficulty:'hard'}};
 assert.equal(isGameConfig(game.config),true);
 assert.deepEqual(parseGameBackup(serializeGameBackup(game)),game);
});
test('Ungültige Teamprofile werden beim Import abgewiesen',()=>{
 const base=sample().config;
 for(const profiles of [{'team-a':{age:'8–10',difficulty:'normal'}},{'100':{age:'8–10',difficulty:'normal'}},{'0':{age:'8–10',difficulty:'extreme'}}]){
  assert.equal(isGameConfig({...base,teamProfiles:profiles}),false);
 }
});

test('Backup-Import lehnt leere Altersangaben und reine Leerzeichen-IDs ab',()=>{
 const base=sample().config;
 assert.equal(isGameConfig({...base,age:'   '}),false);
 assert.equal(isGameConfig({...base,locations:[{id:'   ',name:'Spielplatz',description:''}]}),false);
 assert.equal(isGameConfig({...base,locations:[{id:'a',name:'Wiese',description:''},{id:'b',name:'wiese',description:''}]}),false);
 assert.equal(isGameConfig({...base,locations:[{id:'a',name:'Wiese',description:''},{id:'b',name:'Wald',description:''}]}),true);
});

test('Größenlimit für Backups gilt für UTF-8-Bytes, nicht Zeichen',()=>{
 const payload='ä'.repeat(100_001);
 assert.ok(payload.length<200_000);
 assert.throws(()=>parseGameBackup(payload),/zu groß/);
});
