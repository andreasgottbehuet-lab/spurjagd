import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRenderedPrintSheets,auditRenderedPrintCategories} from '../src/print-dom-audit.ts';

test('Vollständig gerendertes A5-Paket wird freigegeben',()=>{
 for(const count of [1,3,53,200,1000]) assert.deepEqual(auditRenderedPrintSheets(count,count),[]);
});

test('Fehlende oder zusätzliche A5-Blätter sperren den Druck',()=>{
 assert.ok(auditRenderedPrintSheets(53,52).some(issue=>issue.includes('52 von 53')));
 assert.ok(auditRenderedPrintSheets(53,54).some(issue=>issue.includes('54 von 53')));
});

test('Ungültige Seitenzahlen werden nicht als vollständig behandelt',()=>{
 for(const [expected,actual] of [[0,0],[53,-1],[NaN,53],[53,Infinity],[1,1.5]]){
  assert.ok(auditRenderedPrintSheets(expected,actual).length>0);
 }
});

test('Druckfreigabe kontrolliert A5-Kinder-, Spielleitungs- und Etikettenseiten getrennt',()=>{
 const expected={minimumSheets:53,organizerSheets:14,taskSheets:36,labelSheets:3};
 assert.deepEqual(auditRenderedPrintCategories(expected,{total:53,organizer:14,children:36,labels:3}),[]);
 const swapped=auditRenderedPrintCategories(expected,{total:53,organizer:15,children:35,labels:3});
 assert.ok(swapped.some(issue=>issue.includes('Spielleitungsblätter')));
 assert.ok(swapped.some(issue=>issue.includes('Kinderblätter')));
});

test('Nicht zugeordnete oder fehlende Druckblätter verhindern die Druckfreigabe',()=>{
 const expected={minimumSheets:53,organizerSheets:14,taskSheets:36,labelSheets:3};
 assert.ok(auditRenderedPrintCategories(expected,{total:54,organizer:14,children:36,labels:3}).some(issue=>issue.includes('nicht zugeordnete')));
 assert.ok(auditRenderedPrintCategories(expected,{total:52,organizer:14,children:35,labels:3}).some(issue=>issue.includes('Kinderblätter')));
});
