import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan } from '../src/generator.ts';

const config = (overrides = {}) => ({
  players: 12,
  groupSize: 3,
  durationMinutes: 60,
  age: '8–10',
  goal: 'locks',
  locations: [
    {id:'1',name:'Spielplatz',description:''},
    {id:'2',name:'Wiese',description:''},
    {id:'3',name:'Feuerwehr',description:''},
    {id:'4',name:'Sportplatz',description:''},
  ],
  puzzleMinutes: 10,
  walkingMinutes: 5,
  startFinishMinutes: 10,
  ...overrides,
});

test('60 Minuten ergeben drei Stationen pro Team inklusive Gehzeiten und Finale', () => {
  const result = createPlan(config());
  assert.equal(result.stopsPerTeam, 3);
  assert.equal(result.estimatedMinutes, 60);
  assert.equal(result.remainderMinutes, 0);
  assert.equal(result.teams.length, 4);
  assert.deepEqual(result.teams.map(t=>t.memberCount),[3,3,3,3]);
  assert.deepEqual(result.teams.map(t=>t.stations[0].name),['Spielplatz','Wiese','Feuerwehr','Sportplatz']);
});
test('Gruppeneinteilung bleibt auch bei Restgruppen ausgeglichen', () => {
  const result = createPlan(config({players:11,groupSize:3}));
  assert.deepEqual(result.teams.map(t=>t.memberCount),[3,3,3,2]);
  assert.equal(result.teams.reduce((s,t)=>s+t.memberCount,0),11);
});
test('Kurze Spieldauer begrenzt die Stationszahl', () => {
  assert.equal(createPlan(config({durationMinutes:30})).stopsPerTeam,1);
});
test('Mehr Teams als Orte erzeugt Warnhinweis', () => {
  const result=createPlan(config({players:12,groupSize:2,locations:config().locations.slice(0,2)}));
  assert.ok(result.cautions.some(s=>s.includes('Mehr Teams als Standorte')));
});
test('Unmögliche Zeitplanung wird abgewiesen', () => {
  assert.throws(()=>createPlan(config({durationMinutes:30,puzzleMinutes:25,walkingMinutes:10})),/Zeit reicht nicht/);
});
test('Leere und doppelte Standortnamen werden abgewiesen', () => {
  assert.throws(()=>createPlan(config({locations:[{id:'1',name:' ',description:''}]})),/Namen/);
  assert.throws(()=>createPlan(config({locations:[{id:'1',name:'Wiese',description:''},{id:'2',name:'wiese',description:''}]})),/eindeutig/);
});
test('Ungueltige Team- und Zeitparameter werden abgewiesen',()=>{
  assert.throws(()=>createPlan(config({players:0})),/Teilnehmerzahl/);
  assert.throws(()=>createPlan(config({groupSize:0})),/Gruppengröße/);
  assert.throws(()=>createPlan(config({walkingMinutes:-1})),/Gehzeit/);
});
