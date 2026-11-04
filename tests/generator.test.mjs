import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, teamSizes } from '../src/generator.ts';

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

test('Alle Teams können denselben Start und dieselbe Strecke nutzen', () => {
  const plan = createPlan(config({ startMode:'shared', routeMode:'same', finishMode:'meeting', meetingPoint:'Zuhause' }));
  assert.ok(plan.teams.every(t=>t.stations[0].name==='Spielplatz'));
  assert.ok(plan.teams.every(t=>t.stations.map(x=>x.name).join(',') === plan.teams[0].stations.map(x=>x.name).join(',')));
  assert.ok(plan.teams.every(t=>t.finish==='Zuhause'));
});
test('Verteilte Startpunkte mit wechselnder Umlaufrichtung', () => {
  const plan = createPlan(config({startMode:'distributed', routeMode:'varied'}));
  assert.deepEqual(plan.teams.map(t=>t.stations[0].name),['Spielplatz','Wiese','Feuerwehr','Sportplatz']);
  assert.deepEqual(plan.teams[1].stations.map(t=>t.name),['Wiese','Spielplatz','Sportplatz']);
  assert.equal(plan.teams[0].stations.length,3);
  assert.ok(plan.teams.every(t=>new Set(t.stations.map(x=>x.id)).size===t.stations.length));
});
test('Gemeinsamer Start mit wechselnden Richtungen und eigenem Ziel',()=>{
  const plan=createPlan(config({startMode:'shared',routeMode:'varied',finishMode:'start'}));
  assert.deepEqual(plan.teams[0].stations.map(x=>x.name),['Spielplatz','Wiese','Feuerwehr']);
  assert.deepEqual(plan.teams[1].stations.map(x=>x.name),['Spielplatz','Sportplatz','Feuerwehr']);
  assert.ok(plan.teams.every(t=>t.finish==='Spielplatz'));
});

test('Expliziter gemeinsamer Start kann zugleich Ziel sein', () => {
  const result=createPlan(config({startMode:'shared',finishMode:'origin',startPoint:'Parkplatz',meetingPoint:'Anderer Ort'}));
  assert.ok(result.teams.every(t=>t.finish==='Parkplatz'));
  assert.equal(result.stopsPerTeam,3);
});
test('Separater Zielort bleibt unabhängig vom Startort', () => {
  const result=createPlan(config({startMode:'shared',finishMode:'meeting',startPoint:'Parkplatz',meetingPoint:'Sporthalle'}));
  assert.ok(result.teams.every(t=>t.finish==='Sporthalle'));
});

test('Doppelte Stations-IDs werden auch bei unterschiedlichen Ortsnamen abgewiesen',()=>{
 assert.throws(()=>createPlan(config({locations:[{id:'same',name:'Spielplatz',description:''},{id:'same',name:'Wiese',description:''}]})),/Stations-IDs/);
 assert.throws(()=>createPlan(config({locations:[{id:' ',name:'Spielplatz',description:''}]})),/Stations-IDs/);
});
test('Alle Varianten der Routenplanung enthalten ausschließlich eindeutige Stationen',()=>{
 for(const startMode of ['shared','distributed']){
  for(const routeMode of ['same','varied']){
   for(let players=1;players<=30;players++){
    const plan=createPlan(config({players,groupSize:3,startMode,routeMode,durationMinutes:90}));
    assert.equal(plan.teams.reduce((sum,team)=>sum+team.memberCount,0),players);
    for(const team of plan.teams){
     assert.equal(new Set(team.stations.map(station=>station.id)).size,team.stations.length);
     assert.equal(team.stations.length,plan.stopsPerTeam);
    }
   }
  }
 }
});

test('Gleichzeitiger Stationsbesuch mehrerer Teams wird gemeldet',()=>{
 const plan=createPlan(config({startMode:'shared',routeMode:'same'}));
 assert.ok(plan.cautions.some(w=>w.includes('Möglicher Andrang')&&w.includes('Spielplatz')));
});
test('Verteilte Starts ohne Stationsüberschneidung erzeugen keine Andrangwarnung',()=>{
 const plan=createPlan(config({startMode:'distributed',routeMode:'same'}));
 assert.equal(plan.cautions.some(w=>w.includes('Möglicher Andrang')),false);
});

test('Teams ab Nummer elf erhalten eindeutige Namen ohne doppeltes Team-Praefix',()=>{
 const plan=createPlan(config({players:36,groupSize:3}));
 assert.equal(plan.teams.length,12);
 assert.deepEqual(plan.teams.slice(10).map(team=>team.name),['11','12']);
 assert.equal(new Set(plan.teams.map(team=>team.name)).size,12);
});

test('Verteilte Routen mit Richtungswechsel werden auf gleichzeitige Besuche geprüft',()=>{
 const plan=createPlan(config({players:12,groupSize:3,startMode:'distributed',routeMode:'varied'}));
 for(let slot=0;slot<plan.stopsPerTeam;slot++){
  const stations=plan.teams.map(team=>team.stations[slot].id);
  assert.equal(new Set(stations).size,stations.length);
 }
 assert.equal(plan.cautions.some(w=>w.includes('Möglicher Andrang')),false);
});

test('Mehr Teams als Stationen führen zu konkreten Andrangwarnungen',()=>{
 const plan=createPlan(config({players:18,groupSize:3,startMode:'distributed',routeMode:'same'}));
 assert.ok(plan.cautions.some(w=>w.includes('Mehr Teams als Standorte')));
 assert.ok(plan.cautions.some(w=>w.includes('Möglicher Andrang')&&w.includes('2 Teams')));
});

test('Gruppenprofile werden beim Erzeugen des Spielplans vom Eingabeobjekt entkoppelt',()=>{
 const c={...config(),teamProfiles:{'0':{age:'6–8',difficulty:'easy'},'1':{age:'11–13',difficulty:'hard'}}};
 const original=structuredClone(c.teamProfiles);
 const plan=createPlan(c);
 assert.deepEqual(plan.teams[0].profile,original['0']);
 assert.deepEqual(plan.teams[1].profile,original['1']);
 assert.notStrictEqual(plan.teams[0].profile,c.teamProfiles['0']);
 plan.teams[0].profile.difficulty='hard';
 assert.deepEqual(c.teamProfiles,original);
 assert.deepEqual(createPlan(c).teams[0].profile,original['0']);
});

test('Teams share station IDs but not mutable station objects',()=>{
 const c=config({players:12,groupSize:3,startMode:'shared'});
 const plan=createPlan(c);
 const a=plan.teams[0].stations[0],b=plan.teams[1].stations[0];
 assert.equal(a.id,b.id);
 assert.notStrictEqual(a,b);
 a.name='Changed';
 assert.notEqual(b.name,'Changed');
 assert.notEqual(c.locations[0].name,'Changed');
});

test('13 Kinder werden bei maximal drei pro Team ausgewogen verteilt',()=>{
 const result=createPlan(config({players:13,groupSize:3}));
 assert.deepEqual(result.teams.map(team=>team.memberCount),[3,3,3,2,2]);
 assert.equal(result.teams.reduce((sum,team)=>sum+team.memberCount,0),13);
});

test('Gruppenvorschau stimmt bei jeder Kinderzahl mit dem Spielplan überein',()=>{
 for(let players=1;players<=100;players++){
  for(let groupSize=1;groupSize<=10;groupSize++){
   const sizes=teamSizes(players,groupSize);
   assert.equal(sizes.reduce((sum,n)=>sum+n,0),players);
   assert.ok(sizes.every(n=>n>=1&&n<=groupSize));
   assert.ok(Math.max(...sizes)-Math.min(...sizes)<=1);
   const actual=createPlan(config({players,groupSize})).teams.map(team=>team.memberCount);
   assert.deepEqual(sizes,actual);
  }
 }
});

test('Einzelkind-Gruppe erscheint als Hinweis für die Spielleitung',()=>{
 const result=createPlan(config({players:5,groupSize:2}));
 assert.deepEqual(result.teams.map(team=>team.memberCount),[2,2,1]);
 assert.ok(result.cautions.some(w=>w.includes('nur einem Kind')));
 const balanced=createPlan(config({players:13,groupSize:3}));
 assert.equal(balanced.cautions.some(w=>w.includes('nur einem Kind')),false);
});
