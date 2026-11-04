import {createDefaultGameConfig} from '../src/default-game.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { isGameConfig, isSavedGame, parseGameBackup, serializeGameBackup, saveGame, loadGames, deleteGame, setActiveGameId, activeGameId, importedProjectTitle, projectListChanged, replaceLastGame, backupFilename } from '../src/project-storage.ts';

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
  assert.throws(()=>parseGameBackup('{invalid'),/kein gültiges JSON/);
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

test('Exportierte Sicherungen dürfen das Importlimit nicht überschreiten',()=>{
 const project=sample();
 project.config.routeClueTexts={};
 for(let i=0;i<25;i++)project.config.routeClueTexts['station-'+i]=String.fromCharCode(0).repeat(1500);
 assert.equal(isSavedGame(project),true);
 assert.throws(()=>serializeGameBackup(project),/zu groß/);
});

test('Import lehnt leere Altersangaben in Teamprofilen ab',()=>{
 const game=sample();
 for(const age of ['', ' ', '   ']){
  const invalid={...game.config,teamProfiles:{'0':{age,difficulty:'normal'}}};
  assert.equal(isGameConfig(invalid),false);
  assert.equal(isSavedGame({...game,config:invalid}),false);
 }
});

test('Neue und nach Löschung erzeugte Entwürfe verwenden dieselben neutralen Vorgaben',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const creation=source.slice(source.indexOf('const newProject = () =>'),source.indexOf('const removeProject = () =>'));
 const deletion=source.slice(source.indexOf('const removeProject = () =>'),source.indexOf('const exportProject = () =>'));
 assert.ok(creation.includes('config:createDefaultGameConfig()'));
 assert.ok(deletion.includes('config:createDefaultGameConfig()'));
 assert.ok(deletion.includes('deleteGame(projectId)'));
 assert.ok(deletion.includes('replaceLastGame(projectId,fresh)'));
 assert.ok(deletion.includes('applyGame(fresh)'));
});

test('Projektwechsel speichert offene Eingaben vor dem Laden eines anderen Entwurfs',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const helper=source.slice(source.indexOf('const saveCurrentBeforeSwitch ='),source.indexOf('const newProject ='));
 assert.ok(helper.includes('saveGame(current)'));
 assert.ok(helper.includes('return false'));
 const selector=source.slice(source.indexOf('id="savedProjects"'),source.indexOf('</select>',source.indexOf('id="savedProjects"')));
 assert.ok(selector.includes('saveCurrentBeforeSwitch()'));
 const newProject=source.slice(source.indexOf('const newProject ='),source.indexOf('const removeProject ='));
 assert.ok(newProject.includes('if(!saveCurrentBeforeSwitch()) return'));
 const importer=source.slice(source.indexOf('const importProject ='),source.indexOf('return (',source.indexOf('const importProject =')));
 assert.ok(importer.includes('if(!saveCurrentBeforeSwitch()) return'));
});

test('Beschädigte Browserdaten dürfen durch Autostart nicht überschrieben werden',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const init=source.slice(source.indexOf('useEffect(() => {\n    try {\n      const saved = loadGames()'),source.indexOf('useEffect(() => {\n    if (!storageReady)'));
 assert.ok(init.includes('setStorageReady(true)'));
 assert.ok(init.includes('setStorageReady(false)'));
 assert.ok(init.includes('Automatisches Speichern bleibt'));
 assert.ok(source.includes('if (!storageReady || storageConflict.current) return;'));
});

test('Beschädigte Browserdaten bleiben beim fehlgeschlagenen Speichern unverändert',()=>{
 const old=globalThis.localStorage;
 const memory=new Map([['spurjagd-projects-v1','{kaputt']]);
 globalThis.localStorage={
  getItem:key=>memory.get(key)??null,
  setItem:(key,value)=>memory.set(key,String(value)),
  removeItem:key=>memory.delete(key)
 };
 try{
  assert.throws(()=>loadGames(),SyntaxError);
  assert.throws(()=>saveGame(sample()),SyntaxError);
  assert.equal(memory.get('spurjagd-projects-v1'),'{kaputt');
 }finally{
  if(old===undefined) delete globalThis.localStorage;
  else globalThis.localStorage=old;
 }
});

test('Bei mehr als vierzig Projekten bleibt der bisherige Datenbestand erhalten',()=>{
 const old=globalThis.localStorage;
 const memory=new Map();
 globalThis.localStorage={
  getItem:key=>memory.get(key)??null,
  setItem:(key,value)=>memory.set(key,String(value)),
  removeItem:key=>memory.delete(key)
 };
 try{
  const existing=Array.from({length:40},(_,i)=>({...sample(),id:'p-'+i}));
  memory.set('spurjagd-projects-v1',JSON.stringify(existing));
  assert.throws(()=>saveGame({...sample(),id:'p-40'}),/Maximal 40/);
  assert.equal(loadGames().length,40);
  assert.equal(memory.get('spurjagd-active-project-v1'),undefined);
 }finally{
  if(old===undefined) delete globalThis.localStorage;
  else globalThis.localStorage=old;
 }
});

test('Doppelte Projektkennungen werden beim Laden abgewiesen',()=>{
 const old=globalThis.localStorage;
 const memory=new Map([['spurjagd-projects-v1',JSON.stringify([sample(),sample()])]]);
 globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
 try{
  assert.throws(()=>loadGames(),/doppelte Projektkennungen/);
  assert.equal(memory.get('spurjagd-projects-v1'),JSON.stringify([sample(),sample()]));
 }finally{
  if(old===undefined) delete globalThis.localStorage;
  else globalThis.localStorage=old;
 }
});

test('Unbekannte Projekte können nicht als aktiv gespeichert werden',()=>{
 const old=globalThis.localStorage;
 const memory=new Map();
 globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
 try{
  saveGame(sample());
  assert.equal(activeGameId(),'test-one');
  assert.throws(()=>setActiveGameId('unbekannt'),/existiert nicht/);
  assert.equal(activeGameId(),'test-one');
  setActiveGameId('test-one');
  assert.equal(activeGameId(),'test-one');
 }finally{
  if(old===undefined) delete globalThis.localStorage;
  else globalThis.localStorage=old;
 }
});

test('Fehler beim Speichern der Projektliste ändern die aktive Kennung nicht',()=>{
 const old=globalThis.localStorage;
 const memory=new Map();
 globalThis.localStorage={
  getItem:key=>memory.get(key)??null,
  setItem:(key,value)=>{
   if(key==='spurjagd-projects-v1' && memory.has(key)) throw new Error('Speicher voll');
   memory.set(key,String(value));
  },
  removeItem:key=>memory.delete(key)
 };
 try{
  saveGame(sample());
  assert.throws(()=>saveGame({...sample(),id:'zweites-projekt'}),/Speicher voll/);
  assert.equal(activeGameId(),'test-one');
  assert.equal(loadGames().length,1);
 }finally{
  if(old===undefined) delete globalThis.localStorage;
  else globalThis.localStorage=old;
 }
});

test('Frische Entwürfe sind vollständig unabhängig und enthalten keine vorherigen Teilnehmer- oder Ortsdaten',()=>{
 const a=createDefaultGameConfig(),b=createDefaultGameConfig();
 assert.equal(isGameConfig(a),true);
 a.players=99;
 a.age='14+';
 a.meetingPoint='Privates Zuhause';
 a.startPoint='Privater Start';
 a.locations[0].name='Geheime Station';
 a.stationCodes['loc-1']='007';
 a.teamProfiles['0']={age:'14+',difficulty:'hard'};
 assert.equal(b.players,12);
 assert.equal(b.age,'8–10');
 assert.equal(b.meetingPoint,'Treffpunkt');
 assert.equal(b.startPoint,'Treffpunkt');
 assert.equal(b.locations[0].name,'Spielplatz');
 assert.deepEqual(b.stationCodes,{});
 assert.deepEqual(b.teamProfiles,{});
 assert.notStrictEqual(a.locations[0],b.locations[0]);
});

test('Importtitel bleiben bei maximal 100 Zeichen gültig',()=>{
 for(const title of ['Geburtstag','A'.repeat(92),'B'.repeat(100)]){
  const result=importedProjectTitle(title);
  assert.ok(result.endsWith(' (Import)'));
  assert.ok(result.length<=100);
  assert.equal(isSavedGame({...sample(),title:result}),true);
 }
 assert.equal(importedProjectTitle('Geburtstag'),'Geburtstag (Import)');
});

test('Cross-tab edits stop autosave and deletion',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes("window.addEventListener('storage',onStorageChange)"));
 assert.ok(source.includes('projectListChanged(event.key)'));
 assert.ok(source.includes('storageConflict.current=true'));
 assert.ok(source.includes('if (!storageReady || storageConflict.current) return;'));
 assert.ok(source.includes('storageConflict.current || !storageReady'));
});

test('Empty saved list is corrupt, not first-run',()=>{
 const old=globalThis.localStorage;
 globalThis.localStorage={getItem:()=>'',setItem:()=>{},removeItem:()=>{}};
 try{assert.throws(()=>loadGames(),/leer oder beschädigt/);}
 finally{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old;}
});

test('Pending edits are saved on pagehide and tab backgrounding',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes("window.addEventListener('pagehide',flushOnExit)"));
 assert.ok(source.includes("document.addEventListener('visibilitychange',onVisibilityChange)"));
 assert.ok(source.includes("document.visibilityState==='hidden'"));
 assert.ok(source.includes('saveGame(current)'));
 assert.ok(source.includes('if(!storageReady || storageConflict.current) return;'));
});

test('Only project-list updates trigger cross-tab protection',()=>{
 assert.equal(projectListChanged('spurjagd-projects-v1'),true);
 assert.equal(projectListChanged(null),true);
 assert.equal(projectListChanged('spurjagd-active-project-v1'),false);
 assert.equal(projectListChanged('unrelated-key'),false);
});

test('After deleting the final project a clean replacement can be persisted and activated',()=>{
 const old=globalThis.localStorage;
 const memory=new Map();
 globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
 try{
  saveGame(sample());
  assert.deepEqual(deleteGame('test-one'),[]);
  const fresh={...sample(),id:'new-draft',title:'Meine Schnitzeljagd',config:createDefaultGameConfig()};
  assert.equal(saveGame(fresh).length,1);
  assert.equal(activeGameId(),'new-draft');
  assert.equal(loadGames()[0].config.meetingPoint,'Treffpunkt');
 }finally{
  if(old===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=old;
 }
});
test('Deleting final project immediately persists replacement in the UI',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const deletion=source.slice(source.indexOf('const removeProject = () =>'),source.indexOf('const exportProject = () =>'));
 assert.ok(deletion.includes('const saved=replaceLastGame(projectId,fresh)'));
 assert.ok(deletion.includes('setProjects(saved);'));
 assert.ok(deletion.includes('applyGame(fresh);'));
});

test('Replacing the last saved project is atomic and validates the old ID',()=>{
 const old=globalThis.localStorage;
 const data=new Map();
 globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
 try{
  saveGame(sample());
  const fresh={...sample(),id:'fresh-project',title:'Neue Schnitzeljagd',config:createDefaultGameConfig()};
  assert.throws(()=>replaceLastGame('missing',fresh),/nicht das letzte/);
  assert.equal(loadGames()[0].id,'test-one');
  assert.deepEqual(replaceLastGame('test-one',fresh),[fresh]);
  assert.equal(activeGameId(),'fresh-project');
  assert.equal(loadGames().length,1);
  assert.equal(loadGames()[0].config.players,12);
 }finally{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old;}
});

test('Failed final-project replacement leaves original project data untouched',()=>{
 const old=globalThis.localStorage;
 const data=new Map();
 let fail=false;
 globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{if(fail&&key==='spurjagd-projects-v1')throw new Error('quota');data.set(key,String(value));},removeItem:key=>data.delete(key)};
 try{
  saveGame(sample());
  fail=true;
  const fresh={...sample(),id:'fresh-project',config:createDefaultGameConfig()};
  assert.throws(()=>replaceLastGame('test-one',fresh),/quota/);
  assert.equal(loadGames()[0].id,'test-one');
  assert.equal(activeGameId(),'test-one');
 }finally{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old;}
});

test('Storage errors block project creation, switching and deletion',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const switcher=source.slice(source.indexOf('const saveCurrentBeforeSwitch ='),source.indexOf('const newProject ='));
 const deletion=source.slice(source.indexOf('const removeProject ='),source.indexOf('const exportProject ='));
 assert.ok(switcher.includes('if (!storageReady)'));
 assert.ok(switcher.includes('return false'));
 assert.ok(deletion.includes('storageConflict.current || !storageReady'));
 assert.ok(deletion.includes('return;'));
});

test('Failed active-project update restores original project list',()=>{
 const previous=globalThis.localStorage;
 const entries=new Map();
 let rejectActive=false;
 globalThis.localStorage={
  getItem:key=>entries.get(key)??null,
  setItem:(key,value)=>{if(rejectActive&&key==='spurjagd-active-project-v1')throw new Error('active write denied');entries.set(key,String(value));},
  removeItem:key=>entries.delete(key)
 };
 try{
  saveGame(sample());
  rejectActive=true;
  const fresh={...sample(),id:'replacement',config:createDefaultGameConfig()};
  assert.throws(()=>replaceLastGame('test-one',fresh),/Wiederherstellung|active write denied/);
  assert.equal(loadGames()[0].id,'test-one');
  assert.equal(activeGameId(),'test-one');
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('Saving a project rolls back if the active project key cannot be written',()=>{
 const previous=globalThis.localStorage;
 const entries=new Map();
 let deny=false;
 globalThis.localStorage={
  getItem:key=>entries.get(key)??null,
  setItem:(key,value)=>{if(deny&&key==='spurjagd-active-project-v1')throw new Error('denied');entries.set(key,String(value));},
  removeItem:key=>entries.delete(key)
 };
 try{
  saveGame(sample());
  deny=true;
  assert.throws(()=>saveGame({...sample(),id:'second'}));
  assert.equal(loadGames().length,1);
  assert.equal(loadGames()[0].id,'test-one');
  assert.equal(activeGameId(),'test-one');
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('Deleting an active project rolls back if clearing active key fails',()=>{
 const previous=globalThis.localStorage;
 const entries=new Map();
 let deny=false;
 globalThis.localStorage={
  getItem:key=>entries.get(key)??null,
  setItem:(key,value)=>entries.set(key,String(value)),
  removeItem:key=>{if(deny&&key==='spurjagd-active-project-v1')throw new Error('denied');entries.delete(key);}
 };
 try{
  saveGame(sample());
  deny=true;
  assert.throws(()=>deleteGame('test-one'));
  assert.equal(loadGames().length,1);
  assert.equal(loadGames()[0].id,'test-one');
  assert.equal(activeGameId(),'test-one');
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('Deleting one of several projects selects the surviving project atomically',()=>{
 const previous=globalThis.localStorage;
 const entries=new Map();
 globalThis.localStorage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,String(value)),removeItem:key=>entries.delete(key)};
 try{
  saveGame(sample());
  saveGame({...sample(),id:'second'});
  assert.equal(activeGameId(),'second');
  assert.deepEqual(deleteGame('second').map(x=>x.id),['test-one']);
  assert.equal(activeGameId(),'test-one');
  assert.throws(()=>deleteGame('unknown'),/nicht gefunden/);
  assert.equal(activeGameId(),'test-one');
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('Deleting active project with surviving draft rolls back on failed active selection',()=>{
 const previous=globalThis.localStorage;
 const entries=new Map();
 let deny=false;
 globalThis.localStorage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>{if(deny&&key==='spurjagd-active-project-v1')throw new Error('denied');entries.set(key,String(value));},removeItem:key=>entries.delete(key)};
 try{
  saveGame(sample());
  saveGame({...sample(),id:'second'});
  deny=true;
  assert.throws(()=>deleteGame('second'));
  assert.equal(loadGames().length,2);
  assert.equal(activeGameId(),'second');
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('JSON-Sicherungen erhalten lesbare und sichere Dateinamen',()=>{
 assert.equal(backupFilename({title:'Doras Schatzsuche',id:'abc12345-0000'}),'spurjagd-Doras-Schatzsuche-abc12345.json');
 assert.equal(backupFilename({title:'///',id:'!'}),'spurjagd-projekt-sicherung.json');
 assert.equal(backupFilename({title:'Rätsel für Groß & Klein',id:'abcdef12'}),'spurjagd-Raetsel-fuer-Gross-Klein-abcdef12.json');
 assert.ok(backupFilename({title:'A'.repeat(200),id:'12345678'}).length<80);
});

test('Projektwechsel behandelt Fehler der aktiven Projektauswahl',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const start=source.indexOf('id="savedProjects"');
 const select=source.slice(start,source.indexOf('</select>',start));
 assert.ok(select.includes('try { setActiveGameId(project.id); applyGame(project);'));
 assert.ok(select.includes('Projektwechsel fehlgeschlagen:'));
});

test('Sicherung bleibt auch nach dem Loeschen eines Projekts importierbar',()=>{
 const source=sample();
 const backup=serializeGameBackup(source);
 const restored=parseGameBackup(backup);
 assert.deepEqual(restored,source);
 assert.equal(backupFilename(restored).endsWith('.json'),true);
});

test('Browser acceptance exercises the complete local project lifecycle',()=>{
 const script=readFileSync(new URL('../scripts/verify-project-browser.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8');
 for(const marker of ['Autosave','JSON export','Immediate export includes unsaved edits','New project','Save before project switch','Switch and reload','JSON import','Invalid backup rejected','Cancel deletion','Delete project','Last project replacement','Concurrent tab change detected']) assert.ok(script.includes(marker),marker);
 assert.ok(script.includes('project-browser-report.json'));
 assert.ok(script.includes('project-browser-failure.png'));
 assert.ok(workflow.includes('node scripts/verify-project-browser.mjs'));
});

test('Browserprojekt-Pruefung wartet auf echte Zustandsaenderungen',()=>{
 const script=readFileSync(new URL('../scripts/verify-project-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('waitForFunction'));
 assert.ok(script.includes('Import fehlgeschlagen'));
 assert.ok(script.includes('waitForTimeout(850)')); // Negative assertion: allow the 650ms autosave debounce to elapse.
});

test('Deletion confirmation explains irreversible loss in both languages',()=>{
 const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(ui.includes('Die Löschung kann nicht rückgängig gemacht werden.'));
 assert.ok(ui.includes('This cannot be undone.'));
});

test('Import starts planning at step one without changing the original project',()=>{
 const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const begin=ui.indexOf('const importProject = async');
 const end=ui.indexOf('return (',begin);
 const handler=ui.slice(begin,end);
 assert.ok(handler.includes('id:newGameId()'));
 assert.ok(handler.includes('setActiveStep(1)'));
 assert.ok(handler.includes('importedProjectTitle(imported.title)'));
});

test('Queued autosave checks cross-tab conflict before writing',()=>{
 const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const start=ui.indexOf('const timeout = window.setTimeout(() => {');
 const end=ui.indexOf('}, 650);',start);
 const callback=ui.slice(start,end);
 assert.ok(callback.includes('if (storageConflict.current) return;'));
 assert.ok(callback.indexOf('if (storageConflict.current) return;') < callback.indexOf('saveGame(project)'));
});

test('Partial project-list write is rolled back when storage throws',()=>{
 const previous=globalThis.localStorage;
 const entries=new Map();
 let fail=false;
 globalThis.localStorage={
  getItem:key=>entries.get(key)??null,
  setItem:(key,value)=>{
   entries.set(key,String(value));
   if(fail&&key==='spurjagd-projects-v1'){fail=false;throw new Error('partial write');}
  },
  removeItem:key=>entries.delete(key)
 };
 try{
  saveGame(sample());
  const before=globalThis.localStorage.getItem('spurjagd-projects-v1');
  fail=true;
  assert.throws(()=>saveGame({...sample(),title:'Not saved'}),/partial write/);
  assert.equal(globalThis.localStorage.getItem('spurjagd-projects-v1'),before);
  assert.equal(activeGameId(),'test-one');
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('Project list sorts timestamps with different UTC offsets correctly',()=>{
 const previous=globalThis.localStorage;
 const entries=new Map();
 globalThis.localStorage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,String(value)),removeItem:key=>entries.delete(key)};
 try{
  saveGame({...sample(),id:'older',updatedAt:'2026-11-02T20:00:00+02:00'});
  saveGame({...sample(),id:'newer',updatedAt:'2026-11-02T19:30:00Z'});
  assert.deepEqual(loadGames().map(x=>x.id),['newer','older']);
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('Atomic storage rejection preserves original error without unnecessary rollback writes',()=>{
 const previous=globalThis.localStorage;
 const memory=new Map();
 let rejectedWrites=0;
 globalThis.localStorage={
  getItem:key=>memory.get(key)??null,
  setItem:(key,value)=>{
   if(key==='spurjagd-projects-v1' && memory.has(key)){rejectedWrites++;throw new Error('quota exceeded');}
   memory.set(key,String(value));
  },
  removeItem:key=>memory.delete(key)
 };
 try{
  saveGame(sample());
  assert.throws(()=>saveGame({...sample(),title:'Updated'}),/quota exceeded/);
  assert.equal(rejectedWrites,1);
  assert.equal(loadGames()[0].title,'Geburtstag');
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('Windows browser acceptance is optional and checks real browser plus A5 tools',()=>{
 const script=readFileSync(new URL('../scripts/verify-windows-browser.ps1',import.meta.url),'utf8');
 assert.ok(script.includes('verify-project-browser.mjs'));
 assert.ok(script.includes('verify-a5-browser.mjs'));
 assert.ok(script.includes('Get-Command pdfinfo'));
 assert.ok(script.includes('Start-Process'));
 assert.ok(script.includes('taskkill.exe'));
 assert.ok(script.includes('strictPort'));
});

test('Deleting a project resets the planner before editing another saved project',()=>{
 const ui=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const deletion=ui.slice(ui.indexOf('const removeProject = () =>'),ui.indexOf('const exportProject = () =>'));
 assert.ok(deletion.includes('applyGame(remaining[0]); setActiveStep(1);'));
});

test('Browser report records an explicit result and timestamps',()=>{
 const script=readFileSync(new URL('../scripts/verify-project-browser.mjs',import.meta.url),'utf8');
 assert.ok(script.includes('startedAt'));
 assert.ok(script.includes('finishedAt'));
 assert.ok(script.includes('passed: errors.length === 0'));
});
