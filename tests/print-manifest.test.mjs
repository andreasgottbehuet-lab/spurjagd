import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlan} from '../src/generator.ts';
import {createPrintManifest, ROUTE_QUESTIONS_PER_A5_SHEET, routeSheetCount, ORGANIZER_CAUTIONS_PER_A5_SHEET, ORGANIZER_ROUTES_PER_A5_SHEET, ORGANIZER_ENVELOPES_PER_A5_SHEET, organizerGroupPageRanges, nonEmptyOrganizerGroups, organizerCautionSheetCount, organizerSheetCount} from '../src/print-manifest.ts';
import {auditPrintManifest} from '../src/print-manifest-audit.ts';
import {generateCreativeRouteClue,verifyRouteQuestions,normalizeSolutionWord} from '../src/puzzles.ts';
const config={players:12,groupSize:3,durationMinutes:60,age:'8–10',goal:'locks',locations:[{id:'a',name:'Spielplatz',description:''},{id:'b',name:'Wiese',description:''},{id:'c',name:'Feuerwehr',description:''},{id:'d',name:'Sportplatz',description:''}],puzzleMinutes:10,walkingMinutes:5,startFinishMinutes:10,meetingPoint:'Zuhause'};
test('Vier Gruppen mit drei Stationen brauchen 12 Umschläge und kompakte Spielleitungsseiten',()=>{const m=createPrintManifest(createPlan(config));assert.equal(m.envelopes.length,12);assert.equal(m.taskSheets,24);assert.ok(m.envelopes.every(e=>e.sheetCount===2));assert.equal(new Set(m.envelopes.map(e=>e.id)).size,m.envelopes.length);assert.equal(m.labelSheets,3);assert.equal(m.organizerSheets,8);assert.equal(m.minimumSheets,35);});
test('Umschläge zeigen je Gruppe die korrekte Station und das korrekte Ziel',()=>{const plan=createPlan({...config,routeMode:'varied'});const m=createPrintManifest(plan);for(const team of plan.teams){for(let i=0;i<team.stations.length;i++){const e=m.envelopes.find(x=>x.team===team.name&&x.stationNumber===i+1);assert.equal(e.stationId,team.stations[i].id);assert.equal(e.destination,team.stations[i+1]?.name??team.finish);}}});

test('Vollständige A5-Druckpakete bestehen die Plausibilitätsprüfung',()=>{const plan=createPlan(config);assert.deepEqual(auditPrintManifest(plan,createPrintManifest(plan)),[]);});
test('Fehlende Umschläge und falsche Ziele verhindern die Druckfreigabe',()=>{const plan=createPlan(config);const manifest=createPrintManifest(plan);manifest.envelopes[0].destination='Falscher Ort';assert.ok(auditPrintManifest(plan,manifest).some(x=>x.includes('Zielort')));manifest.envelopes.pop();assert.ok(auditPrintManifest(plan,manifest).some(x=>x.includes('Umschlaganzahl')));});
test('Doppelte Kennungen und falsche Blattanzahl werden erkannt',()=>{const plan=createPlan(config);const manifest=createPrintManifest(plan);manifest.envelopes[1].id=manifest.envelopes[0].id;manifest.taskSheets=1;assert.ok(auditPrintManifest(plan,manifest).some(x=>x.includes('eindeutig')));assert.ok(auditPrintManifest(plan,manifest).some(x=>x.includes('Aufgabenblätter')));});

test('Packliste erkennt manipulierte Gruppen-, Stations- und Blattangaben einzeln',()=>{
 const plan=createPlan({...config,routeMode:'varied',startMode:'distributed'});
 const mutations=[
  [m=>{m.envelopes[0].stationId='unknown';},'falsche Station'],
  [m=>{m.envelopes[0].stationName='Andere Wiese';},'falsche Station'],
  [m=>{m.envelopes[0].stationTotal=99;},'Umschlagbeschriftung'],
  [m=>{m.envelopes[0].teamIndex=99;},'Umschlag'],
  [m=>{m.envelopes[0].sheetCount=5;},'Anzahl A5-Blätter'],
  [m=>{m.envelopes[0].destination='Geheimer falscher Ort';},'Zielort'],
  [m=>{m.envelopes[0].id='falsche-kennung';},'Umschlag']
 ];
 for(const [mutate,expected] of mutations){
  const manifest=createPrintManifest(plan);
  mutate(manifest);
  const issues=auditPrintManifest(plan,manifest);
  assert.ok(issues.some(issue=>issue.includes(expected)),expected+': '+issues.join(' | '));
 }
});

test('Fehlerhafte Seitenzahl verhindert Druckfreigabe',()=>{const plan=createPlan(config);const m=createPrintManifest(plan);m.minimumSheets=1;assert.ok(auditPrintManifest(plan,m).some(x=>x.includes('Mindestumfang')));});

test('Falsche Teambezeichnung auf Umschlag wird erkannt',()=>{const plan=createPlan(config);const m=createPrintManifest(plan);m.envelopes[0].team='Fremde Gruppe';assert.ok(auditPrintManifest(plan,m).some(x=>x.includes('Umschlagbeschriftung')));});

test('Etikettenseiten wachsen in Vierergruppen und werden geprüft',()=>{
 for(const players of [3,12,15,18]){
  const plan=createPlan({...config,players});
  const manifest=createPrintManifest(plan);
  assert.equal(manifest.labelSheets,Math.ceil(manifest.envelopes.length/4));
  assert.deepEqual(auditPrintManifest(plan,manifest),[]);
 }
 const plan=createPlan(config),manifest=createPrintManifest(plan);
 manifest.labelSheets=1;
 assert.ok(auditPrintManifest(plan,manifest).some(issue=>issue.includes('Etikettenseiten')));
});

test('Spielleitungsseiten sind separat gezählt und geprüft',()=>{
 const plan=createPlan(config),m=createPrintManifest(plan);
 assert.equal(m.organizerSheets,8);
 m.organizerSheets=1;
 assert.ok(auditPrintManifest(plan,m).some(issue=>issue.includes('Spielleitungsseiten')));
});

test('Gesamtumfang wird unabhängig berechnet',()=>{const plan=createPlan(