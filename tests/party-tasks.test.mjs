import test from 'node:test';
import assert from 'node:assert/strict';
import {PARTY_TASKS} from '../src/party-tasks.ts';

test('Party-Aufgabenkarten sind vollständig, eindeutig und decken Kategorien und Orte ab',()=>{
 const expected=['Sackhüpfen','Eierlauf','Stopptanz','Ballonplatzen','Fühlsack','Geräuschequiz','Tierpantomime','Hindernisparcours','Kleiderrennen','Turmbau'];
 assert.equal(PARTY_TASKS.length,10);
 assert.deepEqual(PARTY_TASKS.map(task=>task.titel),expected);
 for(const key of ['id','titel','regel','alterVon','alterBis','material','dauerMinuten','kategorie','orte'])assert.ok(PARTY_TASKS.every(task=>key in task));
 for(const field of ['id','titel'])assert.equal(new Set(PARTY_TASKS.map(task=>task[field])).size,10);
 for(const task of PARTY_TASKS){
  assert.ok(Object.values(task).every(value=>Array.isArray(value)?value.length>0:value!==''&&value!==null&&value!==undefined));
  assert.ok(task.alterVon<=task.alterBis);
  assert.ok(['bewegung','knobeln','natur','teamwork'].includes(task.kategorie));
  assert.ok(task.orte.length>0&&task.orte.every(place=>['drinnen','garten','park'].includes(place)));
 }
 for(const category of ['bewegung','knobeln','natur','teamwork'])assert.ok(PARTY_TASKS.filter(task=>task.kategorie===category).length>=2,category);
 for(const place of ['drinnen','garten','park'])assert.ok(PARTY_TASKS.filter(task=>task.orte.includes(place)).length>=2,place);
});
