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
  assert.equal(isGameConfig({...sample().config,locations:[{id:'1',name:'',description:''}]}),false);
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

test('Backup-Grenze misst UTF-8-Bytes statt Zeichen', () => {
  const backup = serializeGameBackup({...sample(),title:'Überraschung'});
  assert.equal(parseGameBackup(backup).title,'Überraschung');
  const tooLarge = 'ä'.repeat(100_001);
  assert.ok(tooLarge.length <= 200_000);
  assert.throws(()=>parseGameBackup(tooLarge),/zu groß/);
});

test('Schloss-Codes und Seed bleiben im JSON-Backup erhalten',()=>{
  const project = {...sample(),config:{...sample().config,stationCodes:{'1':'0007'},puzzleSeed:4294967295}};
  assert.equal(isSavedGame(project),true);
  assert.deepEqual(parseGameBackup(serializeGameBackup(project)),project);
});
test('Unvollständige Codes sind als Entwurf erlaubt, ungültige Eingaben nicht',()=>{
  const config=sample().config;
  assert.equal(isGameConfig({...config,stationCodes:{'1':'00'},puzzleSeed:0}),true);
  assert.equal(isGameConfig({...config,stationCodes:{'1':'0007'}}),true);
  assert.equal(isGameConfig({...config,stationCodes:{'1':'abc'}}),false);
  assert.equal(isGameConfig({...config,stationCodes:{unknown:'123'}}),false);
  assert.equal(isGameConfig({...config,puzzleSeed:-1}),false);
  assert.equal(isGameConfig({...config,puzzleSeed:4294967296}),false);
  assert.equal(isGameConfig(config),true); // Ältere Sicherungen bleiben gültig.
});

test('Hinweiskarten mit Zielbindung überstehen Export und Import', () => {
  const game = {...sample(),config:{...sample().config,routeClues:{'0:0':{to:'@finish:Zuhause',text:'Löse das letzte Rätsel.'}}}};
  assert.equal(isGameConfig(game.config),true);
  assert.deepEqual(parseGameBackup(serializeGameBackup(game)),game);
  assert.equal(isGameConfig({...sample().config,routeClues:{'0:0':{to:'b',text:42}}}),false);
  assert.equal(isGameConfig({...sample().config,routeClues:{'../':{to:'b',text:'A'}}}),false);
});

test('Gemeinsame Zielhinweise bleiben optional und überstehen die Backup-Rundreise', () => {
  const game=sample();
  game.config.destinationClues={'station:1':'Sucht den Ort zum Schaukeln.','finish:Zuhause':'Eure Begleitung wartet hier.'};
  assert.deepEqual(parseGameBackup(serializeGameBackup(game)),game);
  assert.equal(isSavedGame(sample()),true);
  for(const invalid of [null,[],42,{'station:1':42},{'station:1':'x'.repeat(401)},{'falsch':'Hinweis'},{'station:':'Hinweis'}]){
    assert.equal(isGameConfig({...sample().config,destinationClues:invalid}),false);
  }
});
