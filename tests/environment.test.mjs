import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlan,INDOOR_CAUTION} from '../src/generator.ts';
import {createDefaultGameConfig,DEFAULT_LOCATIONS} from '../src/default-game.ts';
import {applyEnvironmentPreset,indoorLocations,isPresetLocations,siteSafetyCheck,OUTDOOR_SITE_CHECK} from '../src/environment.ts';
import {isGameConfig,loadGames,normalizeGameConfig,parseGameBackup,serializeGameBackup} from '../src/project-storage.ts';

const ORIGINAL_PARAGRAPH='Strecken, Straßenquerungen, Gewässer, Baustellen, Wetter, Zugänglichkeit und Aufsicht prüfen. Keine Aufgaben an gefährlichen oder unzugänglichen Orten platzieren. Den Kindern den nächsten Zielort nicht vor dem Rätsel verraten.';
const OUTDOOR_CAUTION='Gehzeiten und Aufenthaltszeiten sind Schätzwerte. Wege, Querungen, Zugänglichkeit und Aufsicht vor Ort prüfen.';
const legacyConfig=()=>{const config=createDefaultGameConfig();delete config.environment;return config;};

test('Standard ist outdoor und der Plan bleibt unverändert',()=>{
 const config=createDefaultGameConfig();
 assert.equal(config.environment,'outdoor');
 const legacy=createPlan(legacyConfig());
 assert.deepEqual(createPlan(config),legacy);
 assert.equal(legacy.cautions.at(-1),OUTDOOR_CAUTION);
 assert.equal(legacy.cautions.includes(INDOOR_CAUTION),false);
});
test('Planungshinweise je Umgebung',()=>{
 const indoor=createPlan({...createDefaultGameConfig(),environment:'indoor'}).cautions;
 assert.ok(indoor.includes(INDOOR_CAUTION));
 assert.equal(indoor.includes(OUTDOOR_CAUTION),false);
 const mixed=createPlan({...createDefaultGameConfig(),environment:'mixed'}).cautions;
 assert.ok(mixed.includes(INDOOR_CAUTION));
 assert.ok(mixed.includes(OUTDOOR_CAUTION));
 for(const word of ['Treppen','Türen','Zerbrechliches','Heißes','verbotene Zimmer','Aufsicht','Lautstärke','Nachbarn'])assert.ok(INDOOR_CAUTION.includes(word),word);
 assert.throws(()=>createPlan({...createDefaultGameConfig(),environment:'space'}),/Ungültige Umgebung/);
});
test('indoor setzt Beispielstationen und 1 Minute Gehzeit nur bei Standardstationen',()=>{
 const defaults={locations:DEFAULT_LOCATIONS.map(l=>({...l})),walkingMinutes:5};
 const de=applyEnvironmentPreset('indoor',defaults,false);
 assert.deepEqual(de.locations.map(l=>l.name),['Küche','Wohnzimmer','Flur','Kinderzimmer']);
 assert.deepEqual(de.locations.map(l=>l.id),DEFAULT_LOCATIONS.map(l=>l.id));
 assert.ok(de.locations.every(l=>l.description.length>0));
 assert.equal(de.walkingMinutes,1);
 const en=applyEnvironmentPreset('indoor',defaults,true);
 assert.deepEqual(en.locations.map(l=>l.name),['Kitchen','Living room','Hallway','Kids\' room']);
 assert.equal(en.walkingMinutes,1);
 assert.ok(isPresetLocations(de.locations)&&isPresetLocations(en.locations));
 // Back to outdoor restores the previous defaults.
 assert.deepEqual(applyEnvironmentPreset('outdoor',de,false),{locations:DEFAULT_LOCATIONS.map(l=>({...l})),walkingMinutes:5});
 assert.deepEqual(applyEnvironmentPreset('outdoor',en,true),{locations:DEFAULT_LOCATIONS.map(l=>({...l})),walkingMinutes:5});
});
test('bearbeitete Stationen werden nie überschrieben',()=>{
 const edited={locations:[{...DEFAULT_LOCATIONS[0],name:'Opas Garten'},...DEFAULT_LOCATIONS.slice(1).map(l=>({...l}))],walkingMinutes:7};
 assert.deepEqual(applyEnvironmentPreset('indoor',edited,false),edited);
 assert.deepEqual(applyEnvironmentPreset('outdoor',edited,false),edited);
 // mixed changes the walking estimate independently and preserves edited stations.
 assert.deepEqual(applyEnvironmentPreset('mixed',edited,false),{locations:edited.locations,walkingMinutes:3});
 const indoorEdited={locations:indoorLocations(false).map((l,i)=>i===1?{...l,description:'Sofa mit Decke'}:l),walkingMinutes:1};
 assert.deepEqual(applyEnvironmentPreset('outdoor',indoorEdited,false),indoorEdited);
});
test('mixed behält Standard- und Indoor-Beispielstationen und setzt 3 Minuten',()=>{
 const defaults={locations:DEFAULT_LOCATIONS.map(l=>({...l})),walkingMinutes:5};
 assert.deepEqual(applyEnvironmentPreset('mixed',defaults,false),{locations:defaults.locations,walkingMinutes:3});
 const indoor={locations:indoorLocations(false),walkingMinutes:1};
 assert.deepEqual(applyEnvironmentPreset('mixed',indoor,false),{locations:indoor.locations,walkingMinutes:3});
});
test('altes Projekt ohne Umgebung lädt und Roundtrip bleibt erhalten',()=>{
 const legacy={version:1,id:'old',title:'Alt',updatedAt:'2026-11-02T20:00:00.000Z',config:legacyConfig()};
 assert.equal('environment' in legacy.config,false);
 assert.ok(isGameConfig(legacy.config));
 const restored=parseGameBackup(serializeGameBackup(legacy));
 assert.deepEqual(restored,legacy);
 assert.equal(normalizeGameConfig(restored.config).environment,'outdoor');
 assert.equal(normalizeGameConfig({...legacy.config,environment:'indoor'}).environment,'indoor');
 for(const environment of ['outdoor','indoor','mixed']){
  const project={...legacy,config:{...legacy.config,environment}};
  assert.deepEqual(parseGameBackup(serializeGameBackup(project)),project);
 }
 assert.equal(isGameConfig({...legacy.config,environment:'space'}),false);
});
test('gespeichertes altes Projekt ohne Umgebung wird als outdoor geladen',()=>{
 const memory=new Map();
 const old=globalThis.localStorage;
 globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
 try{
  const legacy={version:1,id:'old',title:'Alt',updatedAt:'2026-11-02T20:00:00.000Z',config:legacyConfig()};
  memory.set('spurjagd-projects-v1',JSON.stringify([legacy]));
  const [loaded]=loadGames();
  assert.equal(loaded.config.environment,'outdoor');
  assert.deepEqual(loaded,{...legacy,config:{...legacy.config,environment:'outdoor'}});
  assert.deepEqual(createPlan(loaded.config),createPlan(legacy.config));
 }finally{
  if(old===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=old;
 }
});
test('Organizer-Absatz: outdoor bleibt in DE und EN byte-identisch',()=>{
 assert.equal(OUTDOOR_SITE_CHECK,ORIGINAL_PARAGRAPH);
 assert.equal(siteSafetyCheck('outdoor',false),ORIGINAL_PARAGRAPH);
 assert.equal(siteSafetyCheck('outdoor',true),ORIGINAL_PARAGRAPH);
 assert.equal(siteSafetyCheck(undefined,true),ORIGINAL_PARAGRAPH);
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const sheet=source.slice(source.indexOf('key="safety-check"'),source.indexOf("key={'routes-'+page}"));
 assert.ok(sheet.includes('<h2>Vor Ort kontrollieren</h2>\n                    <p>{siteSafetyCheck(environment,en)}</p>\n                    <h2>Hinweise aus der Routenplanung</h2>'));
});
test('Organizer-Absatz: indoor und mixed in der UI-Sprache',()=>{
 const indoorDe=siteSafetyCheck('indoor',false);
 for(const word of ['Treppen','Türen','Zerbrechliches','Heißes','verbotene Zimmer','Aufsicht','Lautstärke','Nachbarn'])assert.ok(indoorDe.includes(word),word);
 for(const word of ['Straßenquerungen','Gewässer','Baustellen','Wetter'])assert.equal(indoorDe.includes(word),false,word);
 const indoorEn=siteSafetyCheck('indoor',true);
 for(const word of ['stairs','doors','fragile','hot','off limits','supervision','noise','neighbours'])assert.ok(indoorEn.includes(word),word);
 assert.equal(/[äöüß]/.test(indoorEn),false);
 const mixedDe=siteSafetyCheck('mixed',false);
 for(const word of ['Straßenquerungen','Gewässer','Baustellen','Wetter','Treppen','Heißes','Nachbarn'])assert.ok(mixedDe.includes(word),word);
 const mixedEn=siteSafetyCheck('mixed',true);
 for(const word of ['road crossings','water','building sites','weather','stairs','hot','neighbours'])assert.ok(mixedEn.includes(word),word);
 assert.equal(/[äöüß]/.test(mixedEn),false);
});
test('UI bietet die Umgebungsauswahl zweisprachig an',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 for(const text of ["tx('Umgebung','Setting')","tx('Draußen','Outdoors')","tx('Im Haus','Indoors')","tx('Gemischt','Mixed')","const c = normalizeGameConfig(project.config);","setEnvironment(c.environment);","applyEnvironmentPreset(next, {locations, walkingMinutes}, en)"])assert.ok(source.includes(text),text);
});
