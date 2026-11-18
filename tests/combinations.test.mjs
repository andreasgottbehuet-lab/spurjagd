import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlan} from '../src/generator.ts';
import {auditPrintPacket,routeClueFor} from '../src/print-audit.ts';
import {createPrintManifest} from '../src/print-manifest.ts';
import {auditPrintManifest} from '../src/print-manifest-audit.ts';
import {generateStationChallenge,codeFromPuzzles,hashSeed,verifyCreativeRouteClue,verifyDigitPuzzle} from '../src/puzzles.ts';
import {generateMissingCodes} from '../src/station-codes.ts';
import {suggestSolutionWord,codeForStation,letterFromCode} from '../src/solution-word.ts';
import {AGE_GROUPS,ageLevelFor} from '../src/age-groups.ts';
import {STATION_MODES,resolveStationMode} from '../src/station-mode.ts';
import {SUBJECTS} from '../src/question-bank.ts';
import {readFileSync} from 'node:fs';

// Ortsnamen und Startpunkte so, wie sie in der deutschen bzw. englischen Oberfläche eingegeben werden.
const PLACES={
 de:{names:['Spielplatz','Wiese','Feuerwehrplatz','Sportplatz','Bibliothek','Schulhof','Brunnen','Waldrand'],tail:' mit Bäumen und einer Bank',start:'Zuhause',meeting:'Treffpunkt'},
 en:{names:['Playground','Meadow','Fire station','Sports field','Library','Schoolyard','Fountain','Forest edge'],tail:' area with trees and a bench',start:'Home',meeting:'Meeting point'}
};
const GOALS=['locks','word','cards'];
const VARIANTS=['perTeam','same'];
const CLUE_SETS=['mixed','questions'];
const CLUE_MODES=['questions','description','letters'];

function build({goal,variants,stationMode,profiles,sameFinish,teams,stations,age,lang,clueSet,environment='outdoor',subjects=SUBJECTS}){
 const p=PLACES[lang];
 const locations=p.names.slice(0,stations).map((name,k)=>({id:'loc-'+(k+1),name,description:'Ort'+p.tail+' Nummer '+(k+1)}));
 const config={
  players:teams*2,groupSize:2,durationMinutes:300,age,goal,locations,environment,subjects,
  puzzleMinutes:10,walkingMinutes:5,startFinishMinutes:10,
  startMode:'distributed',routeMode:'varied',
  // Start=Ziel setzt im Planer den Zielmodus 'origin'; sonst gemeinsamer, vom Start verschiedener Zielort.
  finishMode:sameFinish?'origin':'meeting',meetingPoint:p.meeting,startPoint:p.start,
  routeVariants:variants,
  stationModes:Object.fromEntries(locations.map(l=>[l.id,stationMode])),
  routeClueModes:Object.fromEntries(locations.map((l,k)=>[l.id,clueSet==='questions'?'questions':CLUE_MODES[k%3]])),
  stationCodes:{}
 };
 if(profiles) config.teamProfiles=Object.fromEntries(Array.from({length:teams},(_,t)=>[String(t),{age:AGE_GROUPS[t%AGE_GROUPS.length],difficulty:['easy','normal','hard'][t%3]}]));
 const plan=createPlan(config);
 if(goal==='word') config.solutionWord=suggestSolutionWord(plan.stopsPerTeam,lang+stations);
 else config.stationCodes=generateMissingCodes(plan.teams.flatMap(t=>t.stations.map(s=>s.id)),{},lang+stations);
 return {config,plan};
}

function check(combo){
 const label=JSON.stringify(combo);
 let built;
 assert.doesNotThrow(()=>{built=build(combo);},label+': Generator');
 const {config,plan}=built;
 const id='combo-'+hashSeed(label);
 assert.deepEqual(auditPrintPacket(config,plan,id),[],label+': Druckprüfung');
 assert.deepEqual(auditPrintManifest(plan,createPrintManifest(plan,config),config),[],label+': Manifest');
 const cluesByDestination=new Map();
 plan.teams.forEach((team,t)=>{
  const level=ageLevelFor(team.profile?.age??config.age);
  const questions=new Set();
  team.stations.forEach((station,s)=>{
   assert.ok(['single','group'].includes(resolveStationMode(config.stationModes[station.id],s)),label+': Aufgabenmodus');
   const code=codeForStation(config,plan,t,s);
   if(config.goal==='word') assert.ok(letterFromCode(code),label+': Buchstabencode');
   const challenge=generateStationChallenge(station.id,code,level,hashSeed(id));
   assert.ok(challenge.puzzles.every((puzzle,i)=>verifyDigitPuzzle(puzzle)&&puzzle.expectedDigit===Number(code[i])),label+': unabhängig gelöste Ziffern');
   assert.equal(codeFromPuzzles(challenge),code,label+': Code');
   const clue=routeClueFor(config,plan,id,t,s);
   const destination=team.stations[s+1]?.name??team.finish;
   assert.equal(clue.answer,destination,label+': Ziel');
   assert.ok(verifyCreativeRouteClue(clue),label+': Wegrätsel');
   for(const row of clue.rows??[]){
    assert.ok(!questions.has(row.question),label+': doppelte Frage im Team '+team.name+': '+row.question);
    questions.add(row.question);
   }
   // „Rätsel gleich“: gleiches Ziel und gleiche Altersstufe ergeben für alle Gruppen dasselbe Rätsel.
   if(config.routeVariants==='same'&&!team.stations.slice(0,s).some((prior,i)=> (team.stations[i+1]?.name??team.finish)===destination)){
    const key=destination+'|'+level, text=JSON.stringify(clue);
    assert.equal(cluesByDestination.get(key)??text,text,label+': Rätsel für alle Gruppen gleich');
    cluesByDestination.set(key,text);
   }
  });
 });
}

function* product(dimensions){
 const entries=Object.entries(dimensions);
 const walk=function*(index,current){
  if(index===entries.length){ yield {...current}; return; }
  const [key,values]=entries[index];
  for(const value of values) yield* walk(index+1,{...current,[key]:value});
 };
 yield* walk(0,{});
}
const TEAMS=[1,2,3,4,5,6], STATIONS=[3,4,5,6,7,8];

// Drei vollständig gekreuzte Blöcke (kein Rotieren): jeder Block kreuzt Spielziel, Rätsel je Gruppe/gleich und Sprache
// mit einer Gruppe weiterer Optionen. Ein einziges Gesamtprodukt aller Optionen (~70 000 Fälle) wäre für npm test zu langsam.
function runAll(dimensions,expected){
 let count=0;
 for(const combo of product(dimensions)){ check(combo); count++; }
 assert.equal(count,expected);
}
const BASE={goal:GOALS,variants:VARIANTS,lang:['de','en']};

test('Kombinationen: Teams 1–6 × Stationen 3–8 × Spielziel × Rätsel je Gruppe/gleich × Sprache',()=>{
 runAll({...BASE,teams:TEAMS,stations:STATIONS,stationMode:['auto'],profiles:[false],sameFinish:[false],age:['8–10'],clueSet:['mixed']},6*6*3*2*2);
});

test('Kombinationen: alle Altersstufen × Schwierigkeit je Team × Rätselarten × Spielziel × Rätsel je Gruppe/gleich × Sprache (6 Teams, 8 Stationen)',()=>{
 runAll({...BASE,age:AGE_GROUPS,profiles:[false,true],clueSet:CLUE_SETS,teams:[6],stations:[8],stationMode:['auto'],sameFinish:[false]},AGE_GROUPS.length*2*2*3*2*2);
});

test('Kombinationen: Einzel/Gruppe/abwechselnd × Start=Ziel/verschieden × Schwierigkeit je Team × Spielziel × Rätsel je Gruppe/gleich × Sprache',()=>{
 runAll({...BASE,stationMode:STATION_MODES,sameFinish:[true,false],profiles:[false,true],teams:[3],stations:[4],age:['6–8'],clueSet:['mixed']},3*2*2*3*2*2);
});

test('Kombinationen: Umgebungen × Fächerauswahl × Lösungswort mit Abschluss-Fragenrätsel × Sprache; A5 bleibt Druckformat',()=>{
 runAll({...BASE,goal:['word'],variants:['perTeam','same'],environment:['outdoor','indoor','mixed'],subjects:[[...SUBJECTS],['Erdkunde']],teams:[2],stations:[3],age:['8–10'],clueSet:['questions'],stationMode:['auto'],profiles:[false],sameFinish:[false]},3*2*2*2);
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/@page\s*\{[^}]*size:\s*A5\s+portrait/s,'Kinderblätter bleiben DIN A5 Hochformat');
});
