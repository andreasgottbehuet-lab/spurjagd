import test from 'node:test';
import assert from 'node:assert/strict';
import {PARTY_TASKS} from '../src/party-tasks.ts';
import {planHunt,huntRange,defaultHuntRange} from '../src/hunt-planner.ts';

test('Party-Aufgabenkarten sind vollständig, eindeutig und decken Kategorien und Orte ab',()=>{
 const expected=['Sackhüpfen','Eierlauf','Stopptanz','Ballonplatzen','Fühlsack','Geräuschequiz','Tierpantomime','Hindernisparcours','Kissenbild im Team','Blattformen entdecken','Tierisch leise','Was ist größer?','Kleiderrennen','Turmbau','Regenbogen-Suche','Wolkenbild','Regentropfen-Takt','Regentag-Rätsel','Papierbrücke','Formen in der Stadt','Drei Dinge in einer Farbe','Stadt-Detektive','Bild wie eine Statue','Stadtgeräusche entdecken'];
 assert.equal(PARTY_TASKS.length,24); // Vier angeforderte Kleinkindkarten ergänzen den Bestand.
 assert.deepEqual(PARTY_TASKS.map(task=>task.titel),expected);
 for(const key of ['id','titel','regel','alterVon','alterBis','material','dauerMinuten','kategorie','orte'])assert.ok(PARTY_TASKS.every(task=>key in task));
 for(const field of ['id','titel'])assert.equal(new Set(PARTY_TASKS.map(task=>task[field])).size,24);
 const kleinkind=PARTY_TASKS.filter(task=>task.id.startsWith('kleinkind-'));
 assert.equal(kleinkind.length,4);
 assert.deepEqual(new Set(kleinkind.map(task=>task.kategorie)),new Set(['bewegung','knobeln','natur','teamwork']));
 assert.ok(kleinkind.every(task=>task.alterVon>=4&&task.alterVon<=5&&task.alterBis>=7&&task.alterBis<=8&&task.dauerMinuten<=10));
 for(const ort of ['drinnen','garten','park'])assert.ok(kleinkind.some(task=>task.orte.includes(ort)),ort);
 for(const task of PARTY_TASKS){
  assert.ok(Object.values(task).every(value=>Array.isArray(value)?value.length>0:value!==''&&value!==null&&value!==undefined));
  assert.ok(task.alterVon<=task.alterBis);
  assert.ok(['bewegung','knobeln','natur','teamwork'].includes(task.kategorie));
  assert.ok(task.orte.length>0&&task.orte.every(place=>['drinnen','garten','park'].includes(place)));
 }
 for(const category of ['bewegung','knobeln','natur','teamwork'])assert.ok(PARTY_TASKS.filter(task=>task.kategorie===category).length>=2,category);
 for(const place of ['drinnen','garten','park'])assert.ok(PARTY_TASKS.filter(task=>task.orte.includes(place)).length>=2,place);
});

test('Für jedes Alter und jeden Ort gibt es passende Karten',()=>{
 for(let alter=4;alter<=14;alter++)assert.ok(planHunt({alter,ort:'drinnen'}).anzahl>0,`Alter ${alter}`);
 for(const ort of ['drinnen','garten','park'])assert.ok(planHunt({alter:7,ort}).anzahl>0,ort);
 const regen=PARTY_TASKS.filter(task=>task.id.startsWith('regen'));
 assert.equal(regen.length,5);
 assert.ok(regen.every(task=>task.orte.length===1&&task.orte[0]==='drinnen'));
 for(const alter of [4,5,6,7,8,9,10,11,12,13,14])assert.ok(regen.some(task=>task.alterVon<=alter&&task.alterBis>=alter),`Regen Alter ${alter}`);
 const fotos=PARTY_TASKS.filter(task=>task.id.startsWith('stadt')||task.id==='teamfoto');
 assert.equal(fotos.length,5);
 assert.ok(fotos.every(task=>task.alterVon>=7&&task.alterVon<=10&&task.alterBis===14&&task.orte.length===1&&task.orte[0]==='park'));
 assert.ok(fotos.every(task=>/Erlaubnis der Erwachsenen/i.test(task.regel)&&/fremden Personen/i.test(task.regel)));
});

test('Jagden sind seedfest, orts- und altersgerecht, abwechslungsreich und summieren Dauern',()=>{
 for(let seed=0;seed<20;seed++){
  const input={alter:7,ort:'garten',seed};
  const plan=planHunt(input);
  assert.deepEqual(planHunt(input),plan);
  assert.ok(plan.anzahl>=6&&plan.anzahl<=8,String(plan.anzahl));
  assert.ok(plan.aufgaben.some(task=>task.kategorie==='teamwork'));
  assert.equal(new Set(plan.aufgaben.map(task=>task.id)).size,plan.anzahl);
  assert.ok(plan.aufgaben.every(task=>task.orte.includes('garten')&&task.alterVon<=7&&task.alterBis>=7));
  assert.ok(plan.aufgaben.every((task,index)=>index===0||task.kategorie!==plan.aufgaben[index-1].kategorie));
  assert.equal(plan.gesamtdauerMinuten,plan.aufgaben.reduce((sum,task)=>sum+task.dauerMinuten,0));
 }
 assert.equal(planHunt({alter:6,ort:'garten',seed:3,anzahl:8}).anzahl,8);
});

test('Stationszahl bleibt im Altersbereich; drinnen liegt der Standard immer höher',()=>{
 assert.deepEqual(huntRange(7),[6,10]);
 assert.deepEqual(huntRange(8),[10,15]);
 for(const alter of [5,7,8,12]){
  const [min,max]=huntRange(alter),[innenVon,innenBis]=defaultHuntRange(alter,'drinnen');
  for(const ort of ['garten','park']){
   const [vonDraussen,bisDraussen]=defaultHuntRange(alter,ort);
   assert.ok(min<=vonDraussen&&bisDraussen<innenVon&&innenBis<=max);
  }
 }
 assert.throws(()=>planHunt({alter:10,ort:'garten',anzahl:4}),/zwischen 10 und 15/);
 assert.throws(()=>planHunt({alter:6,ort:'garten',anzahl:11}),/zwischen 6 und 10/);
});

test('Zu wenige passende Karten ergeben einen Teilplan; keine Treffer eine klare Meldung',()=>{
 // Die neue Naturkarte macht Alter 4 im Park nun passend.
 assert.ok(planHunt({alter:4,ort:'park',anzahl:6}).aufgaben.some(task=>task.id==='kleinkind-blattformen'));
 const knapp=planHunt({alter:6,ort:'drinnen',anzahl:10});
 // Die neuen Karten füllen die angeforderten zehn Plätze vollständig.
 assert.equal(knapp.anzahl,10);
 assert.equal(knapp.zuTeil,false);
 assert.equal(knapp.fehlend,0);
 assert.ok(knapp.aufgaben.some(task=>task.kategorie==='teamwork'));
 assert.equal(new Set(knapp.aufgaben.map(task=>task.id)).size,knapp.anzahl);
 const standard=planHunt({alter:6,ort:'drinnen',seed:3});
 // Der größere Bestand deckt den Standardbedarf nun vollständig.
 assert.equal(standard.anzahl,10);
 assert.equal(standard.zuTeil,false);
 assert.equal(standard.fehlend,0);
 assert.ok(standard.aufgaben.every(task=>task.orte.includes('drinnen')&&task.alterVon<=6&&task.alterBis>=6));
 assert.equal(standard.gesamtdauerMinuten,standard.aufgaben.reduce((sum,task)=>sum+task.dauerMinuten,0));
 const older=planHunt({alter:8,ort:'drinnen'});
 assert.equal(older.anzahl,9); // Eine neue Karte passt nun auch für Alter 8.
 assert.equal(older.zuTeil,true);
 assert.ok(older.fehlend>0);
});
