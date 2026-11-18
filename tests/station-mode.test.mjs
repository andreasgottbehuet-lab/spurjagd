import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveStationMode,stationModeLine,isStationMode} from '../src/station-mode.ts';
import {isGameConfig} from '../src/project-storage.ts';

test('automatisch wechselt je Station zwischen Einzel und Gruppe',()=>{
 assert.deepEqual([0,1,2,3].map(i=>resolveStationMode(undefined,i)),['single','group','single','group']);
 assert.deepEqual([0,1].map(i=>resolveStationMode('auto',i)),['single','group']);
});
test('feste Modi gelten unabhaengig von der Position',()=>{
 assert.equal(resolveStationMode('single',1),'single');
 assert.equal(resolveStationMode('group',0),'group');
});
test('Hinweiszeile nennt Reihum nur bei Einzelaufgabe',()=>{
 assert.match(stationModeLine('single',0),/Einzelaufgabe.*Wer löst\? Reihum/);
 assert.match(stationModeLine('group',0),/Gruppenaufgabe/);
 assert.doesNotMatch(stationModeLine('group',0),/Reihum/);
});
test('Validierung akzeptiert nur bekannte Modi',()=>{
 assert.ok(isStationMode('auto')&&isStationMode('single')&&isStationMode('group'));
 assert.ok(!isStationMode('x')&&!isStationMode(undefined));
 const config={players:4,groupSize:2,durationMinutes:60,age:'8–10',goal:'locks',puzzleMinutes:5,walkingMinutes:5,startFinishMinutes:5,startMode:'shared',routeMode:'same',finishMode:'meeting',meetingPoint:'T',locations:[{id:'s1',name:'A',description:''}]};
 assert.ok(isGameConfig(config));
 assert.ok(isGameConfig({...config,stationModes:{s1:'single'}}));
 assert.ok(!isGameConfig({...config,stationModes:{s1:'bogus'}}));
});
