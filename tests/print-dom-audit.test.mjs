import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRenderedPrintSheets,auditRenderedPrintCategories,auditRenderedEnvelopes,auditRenderedLabels,auditPrintOverflow} from '../src/print-dom-audit.ts';

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

test('Jeder Umschlag benötigt genau ein Aufgaben- und Antwortblatt sowie alle Wegrätselblätter',()=>{
 const expected=[{id:'0-a',sheetCount:3},{id:'1-b',sheetCount:5}];
 const correct=[
  {envelopeId:'0-a',kind:'task'},{envelopeId:'0-a',kind:'answer'},{envelopeId:'0-a',kind:'route',routePage:1},
  {envelopeId:'1-b',kind:'task'},{envelopeId:'1-b',kind:'answer'},
  ...Array.from({length:3},(_,index)=>({envelopeId:'1-b',kind:'route',routePage:index+1}))
 ];
 assert.deepEqual(auditRenderedEnvelopes(expected,correct),[]);
 assert.ok(auditRenderedEnvelopes(expected,correct.filter(sheet=>!(sheet.envelopeId==='1-b'&&sheet.kind==='answer'))).some(issue=>issue.includes('Umschlag 1-b')));
 assert.ok(auditRenderedEnvelopes(expected,[...correct,{envelopeId:'0-a',kind:'answer'}]).some(issue=>issue.includes('Umschlag 0-a')));
});

test('Falsche Zuordnung bleibt gesperrt, auch wenn die Gesamtblattzahl unverändert ist',()=>{
 const expected=[{id:'0-a',sheetCount:3},{id:'1-b',sheetCount:3}];
 const sheets=[
  {envelopeId:'0-a',kind:'task'},{envelopeId:'0-a',kind:'answer'},
  {envelopeId:'0-a',kind:'route'},{envelopeId:'0-a',kind:'route'},
  {envelopeId:'1-b',kind:'task'},{envelopeId:'1-b',kind:'answer'}
 ];
 assert.equal(sheets.length,6);
 assert.ok(auditRenderedEnvelopes(expected,sheets).length>0);
 assert.ok(auditRenderedEnvelopes(expected,[...sheets,{envelopeId:'unbekannt',kind:'route'}]).some(issue=>issue.includes('ohne gültige Umschlagzuordnung')));
});

test('Umschläge werden in exakter Druck- und Packreihenfolge geprüft',()=>{
 const expected=[{id:'0-a',sheetCount:3},{id:'1-b',sheetCount:4}];
 const correct=[
  {envelopeId:'0-a',kind:'task'},
  {envelopeId:'0-a',kind:'answer'},
  {envelopeId:'0-a',kind:'route',routePage:1},
  {envelopeId:'1-b',kind:'task'},
  {envelopeId:'1-b',kind:'answer'},
  {envelopeId:'1-b',kind:'route',routePage:1},
  {envelopeId:'1-b',kind:'route',routePage:2}
 ];
 assert.deepEqual(auditRenderedEnvelopes(expected,correct),[]);
 const wrongOrder=[...correct];
 [wrongOrder[0],wrongOrder[1]]=[wrongOrder[1],wrongOrder[0]];
 assert.ok(auditRenderedEnvelopes(expected,wrongOrder).some(issue=>issue.includes('Umschlag-Reihenfolge')));
 const mixed=[...correct];
 [mixed[2],mixed[5]]=[mixed[5],mixed[2]];
 assert.ok(auditRenderedEnvelopes(expected,mixed).some(issue=>issue.includes('Umschlag-Reihenfolge')));
});

test('Etiketten müssen genau einmal und in Umschlag-Reihenfolge vorkommen',()=>{
 const expected=[{id:'0-a',sheetCount:3},{id:'1-b',sheetCount:4},{id:'2-c',sheetCount:3}];
 assert.deepEqual(auditRenderedLabels(expected,['0-a','1-b','2-c']),[]);
 for(const labels of [['1-b','0-a','2-c'],['0-a','1-b'],['0-a','1-b','1-b'],['0-a','1-b','falsch']]){
  assert.ok(auditRenderedLabels(expected,labels).length>0);
 }
 assert.ok(auditRenderedLabels(expected,['0-a','1-b','falsch']).some(issue=>issue.includes('unbekanntem Umschlag')));
});

test('Unbeschriftete Etiketten und falsch einsortierte Mehrseiten-Wegrätsel werden abgewiesen',()=>{
 const expected=[{id:'0-a',sheetCount:5}];
 assert.ok(auditRenderedLabels(expected,['']).some(issue=>issue.includes('unbekanntem Umschlag')));
 const sheets=[
  {envelopeId:'0-a',kind:'task'},
  {envelopeId:'0-a',kind:'route'},
  {envelopeId:'0-a',kind:'answer'},
  {envelopeId:'0-a',kind:'route'},
  {envelopeId:'0-a',kind:'route'}
 ];
 assert.equal(sheets.length,5);
 assert.ok(auditRenderedEnvelopes(expected,sheets).some(issue=>issue.includes('Umschlag-Reihenfolge')));
});

test('Multi-page route puzzles reject swapped page indices',()=>{
 const expected=[{id:'0-a',sheetCount:5}];
 const sheets=[{envelopeId:'0-a',kind:'task'},{envelopeId:'0-a',kind:'answer'},
  {envelopeId:'0-a',kind:'route',routePage:1},{envelopeId:'0-a',kind:'route',routePage:2},
  {envelopeId:'0-a',kind:'route',routePage:3}];
 assert.deepEqual(auditRenderedEnvelopes(expected,sheets),[]);
 const changed=sheets.map(x=>({...x}));changed[3].routePage=3;changed[4].routePage=2;
 assert.ok(auditRenderedEnvelopes(expected,changed).some(x=>x.includes('Wegrätsel-Seitenfolge')));
});

test('Route pages without a number block printing',()=>{
 const sheets=[{envelopeId:'0-a',kind:'task'},{envelopeId:'0-a',kind:'answer'},{envelopeId:'0-a',kind:'route'}];
 assert.ok(auditRenderedEnvelopes([{id:'0-a',sheetCount:3}],sheets).some(x=>x.includes('Wegrätsel-Seitenfolge')));
});

test('A5 overflow audit identifies height, width and invalid measurements',()=>{
 const okay={id:'Team 1',contentWidth:480,contentHeight:700,scrollWidth:480,scrollHeight:699};
 assert.deepEqual(auditPrintOverflow([okay]),[]);
 assert.ok(auditPrintOverflow([{...okay,scrollHeight:730}]).some(x=>x.includes('Seitenhöhe')));
 assert.ok(auditPrintOverflow([{...okay,scrollWidth:520}]).some(x=>x.includes('zu breit')));
 assert.ok(auditPrintOverflow([{...okay,contentHeight:NaN}]).some(x=>x.includes('nicht geprüft')));
});
