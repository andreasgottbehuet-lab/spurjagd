import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlan} from '../src/generator.ts';
import {generateStationChallenge,codeFromPuzzles,generateCreativeRouteClue,hashSeed} from '../src/puzzles.ts';
import {auditPrintPacket} from '../src/print-audit.ts';
import {createPrintManifest} from '../src/print-manifest.ts';
import {auditPrintManifest} from '../src/print-manifest-audit.ts';

const locations=[
 {id:'play',name:'Spielplatz',description:'Schaukeln und eine große Rutsche'},
 {id:'grass',name:'Wiese',description:'Eine breite Wiese mit hohen Bäumen'},
 {id:'fire',name:'Feuerwehrplatz',description:'Schotterfläche neben dem Feuerwehrhaus'},
 {id:'hill',name:'Graswald',description:'Ein Hang zum Schlittenfahren'}
];
const codes={play:'007',grass:'120',fire:'999',hill:'000'};
const config={
 players:12,groupSize:3,durationMinutes:60,age:'8–10',goal:'locks',
 locations,puzzleMinutes:10,walkingMinutes:5,startFinishMinutes:10,
 startMode:'distributed',routeMode:'varied',finishMode:'meeting',
 startPoint:'Zuhause',meetingPoint:'Zuhause',stationCodes:codes,
 routeClueModes:{play:'questions',grass:'description',fire:'letters',hill:'custom'},
 routeClueTexts:{hill:'Sucht den Hang, auf dem im Winter Schlitten fahren.'}
};
test('Komplette Schnitzeljagd: vier Teams, verschiedene Wege und druckfähige A5-Pakete',()=>{
 const plan=createPlan(config);
 const manifest=createPrintManifest(plan);
 assert.equal(plan.teams.length,4);
 assert.equal(plan.stopsPerTeam,3);
 assert.equal(manifest.envelopes.length,12);
 assert.equal(manifest.taskSheets,36);
 assert.deepEqual(auditPrintPacket(config,plan,'integration-test'),[]);
 assert.deepEqual(auditPrintManifest(plan,manifest),[]);
 for(const envelope of manifest.envelopes){
  const code=codes[envelope.stationId];
  const challenge=generateStationChallenge(envelope.stationId,code,'middle',hashSeed('integration-test'));
  assert.equal(codeFromPuzzles(challenge),code);
  assert.equal(challenge.puzzles.length,envelope.sheetCount);
  const target=locations.find(location=>location.name===envelope.destination);
  const mode=config.routeClueModes[target?.id]??'letters';
  const clue=generateCreativeRouteClue(envelope.destination,target?.description??'',mode,hashSeed('integration-test:destination:'+(target?.id??envelope.destination)),config.routeClueTexts[target?.id]??'');
  assert.equal(clue.answer,envelope.destination);
  assert.ok(clue.instruction.length>0);
 }
});
test('Routen und Rätsel bleiben bei wiederholter Generierung reproduzierbar',()=>{
 const first=createPlan(config);
 const second=createPlan(config);
 assert.deepEqual(first,second);
 assert.deepEqual(createPrintManifest(first),createPrintManifest(second));
});
