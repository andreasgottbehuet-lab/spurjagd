import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlan} from '../src/generator.ts';
import {createPrintManifest} from '../src/print-manifest.ts';
const config={players:12,groupSize:3,durationMinutes:60,age:'8–10',goal:'locks',locations:[{id:'a',name:'Spielplatz',description:''},{id:'b',name:'Wiese',description:''},{id:'c',name:'Feuerwehr',description:''},{id:'d',name:'Sportplatz',description:''}],puzzleMinutes:10,walkingMinutes:5,startFinishMinutes:10,meetingPoint:'Zuhause'};
test('Vier Gruppen mit drei Stationen brauchen 12 Umschläge und 36 Aufgabenblätter',()=>{const m=createPrintManifest(createPlan(config));assert.equal(m.envelopes.length,12);assert.equal(m.taskSheets,36);assert.ok(m.envelopes.every(e=>e.sheetCount===3));});
test('Umschläge zeigen je Gruppe die korrekte Station und das korrekte Ziel',()=>{const plan=createPlan({...config,routeMode:'varied'});const m=createPrintManifest(plan);for(const team of plan.teams){for(let i=0;i<team.stations.length;i++){const e=m.envelopes.find(x=>x.team===team.name&&x.stationNumber===i+1);assert.equal(e.stationId,team.stations[i].id);assert.equal(e.destination,team.stations[i+1]?.name??team.finish);}}});
