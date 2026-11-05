import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRenderedPrintSheets,auditRenderedPrintCategories,auditRenderedEnvelopes,auditRenderedLabels,auditRenderedPackingItems,auditRenderedOrganizerSecrets,auditPrintOverflow,auditA5PageBounds} from '../src/print-dom-audit.ts';

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

test('Jeder Umschlag benötigt genau ein Aufgabenblatt und alle Wegrätselblätter, niemals Antwortblätter',()=>{
 const expected=[{id:'0-a',sheetCount:2},{id:'1-b',sheetCount:4}];
 const correct=[{envelopeId:'0-a',kind:'task'},{envelopeId:'0-a',kind:'route',routePage:1},{envelopeId:'1-b',kind:'task'},...Array.from({length:3},(_,i)=>({envelopeId:'1-b',kind:'route',routePage:i+1}))];
 assert.deepEqual(auditRenderedEnvelopes(expected,correct),[]);
 assert.ok(auditRenderedEnvelopes(expected,correct.filter(x=>!(x.envelopeId==='1-b'&&x.routePage===2))).length>0);
 assert.ok(auditRenderedEnvelopes(expected,[...correct,{envelopeId:'0-a',kind:'answer'}]).length>0);
});

test('Falsche Zuordnung bleibt gesperrt, auch wenn die Gesamtblattzahl unverändert ist',()=>{
 const expected=[{id:'0-a',sheetCount:2},{id:'1-b',sheetCount:2}];
 const sheets=[
  {envelopeId:'0-a',kind:'task'},
  {envelopeId:'0-a',kind:'route'},{envelopeId:'0-a',kind:'route'},
  {envelopeId:'1-b',kind:'task'},{envelopeId:'1-b',kind:'answer'}
 ];
 assert.equal(sheets.length,5);
 assert.ok(auditRenderedEnvelopes(expected,sheets).length>0);
 assert.ok(auditRenderedEnvelopes(expected,[...sheets,{envelopeId:'unbekannt',kind:'route'}]).some(issue=>issue.includes('ohne gültige Umschlagzuordnung')));
});

test('Umschläge werden in exakter Druck- und Packreihenfolge geprüft',()=>{
 const expected=[{id:'0-a',sheetCount:2},{id:'1-b',sheetCount:4}];
 const correct=[
  {envelopeId:'0-a',kind:'task'},
  
  {envelopeId:'0-a',kind:'route',routePage:1},
  {envelopeId:'1-b',kind:'task'},
  
  {envelopeId:'1-b',kind:'route',routePage:1},
  {envelopeId:'1-b',kind:'route',routePage:2},
  {envelopeId:'1-b',kind:'route',routePage:3}
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
 const expected=[{id:'0-a',sheetCount:2},{id:'1-b',sheetCount:4},{id:'2-c',sheetCount:2}];
 assert.deepEqual(auditRenderedLabels(expected,['0-a','1-b','2-c']),[]);
 for(const labels of [['1-b','0-a','2-c'],['0-a','1-b'],['0-a','1-b','1-b'],['0-a','1-b','falsch']]){
  assert.ok(auditRenderedLabels(expected,labels).length>0);
 }
 assert.ok(auditRenderedLabels(expected,['0-a','1-b','falsch']).some(issue=>issue.includes('unbekanntem Umschlag')));
});

test('Unbeschriftete Etiketten und falsch einsortierte Mehrseiten-Wegrätsel werden abgewiesen',()=>{
 const expected=[{id:'0-a',sheetCount:4}];
 assert.ok(auditRenderedLabels(expected,['']).some(issue=>issue.includes('unbekanntem Umschlag')));
 const sheets=[
  {envelopeId:'0-a',kind:'task'},
  {envelopeId:'0-a',kind:'route'},
  
  {envelopeId:'0-a',kind:'route'},
  {envelopeId:'0-a',kind:'route'}
 ];
 assert.equal(sheets.length,4);
 assert.ok(auditRenderedEnvelopes(expected,sheets).some(issue=>issue.includes('Wegrätsel-Seitenfolge')));
});

test('Multi-page route puzzles reject swapped page indices',()=>{
 const expected=[{id:'0-a',sheetCount:4}];
 const sheets=[{envelopeId:'0-a',kind:'task'},
  {envelopeId:'0-a',kind:'route',routePage:1},{envelopeId:'0-a',kind:'route',routePage:2},
  {envelopeId:'0-a',kind:'route',routePage:3}];
 assert.deepEqual(auditRenderedEnvelopes(expected,sheets),[]);
 const changed=sheets.map(x=>({...x}));changed[2].routePage=3;changed[3].routePage=2;
 assert.ok(auditRenderedEnvelopes(expected,changed).some(x=>x.includes('Wegrätsel-Seitenfolge')));
});

test('Route pages without a number block printing',()=>{
 const sheets=[{envelopeId:'0-a',kind:'task'},{envelopeId:'0-a',kind:'route'}];
 assert.ok(auditRenderedEnvelopes([{id:'0-a',sheetCount:2}],sheets).some(x=>x.includes('Wegrätsel-Seitenfolge')));
});

test('A5 overflow audit identifies height, width and invalid measurements',()=>{
 const okay={id:'Team 1',contentWidth:480,contentHeight:700,scrollWidth:480,scrollHeight:699};
 assert.deepEqual(auditPrintOverflow([okay]),[]);
 assert.ok(auditPrintOverflow([{...okay,scrollHeight:730}]).some(x=>x.includes('Seitenhöhe')));
 assert.ok(auditPrintOverflow([{...okay,scrollWidth:520}]).some(x=>x.includes('zu breit')));
 assert.ok(auditPrintOverflow([{...okay,contentHeight:NaN}]).some(x=>x.includes('nicht geprüft')));
});

test('Hidden print packets with zero geometry cannot pass overflow checks',()=>{
 const sheet={id:'hidden A5',contentWidth:0,contentHeight:0,scrollWidth:0,scrollHeight:0};
 assert.ok(auditPrintOverflow([sheet]).some(issue=>issue.includes('nicht geprüft')));
 assert.ok(auditPrintOverflow([{...sheet,contentWidth:480,contentHeight:700,scrollWidth:480,scrollHeight:700}],-1).some(issue=>issue.includes('Messtoleranz')));
});

test('A5 printable area catches over-wide and over-tall sheets',()=>{
 const px=96/25.4;
 const valid={id:'A',contentWidth:127*px,contentHeight:189*px,scrollWidth:127*px,scrollHeight:189*px};
 assert.deepEqual(auditA5PageBounds([valid],px),[]);
 assert.ok(auditA5PageBounds([{...valid,id:'B',scrollWidth:130*px}],px).some(x=>x.includes('128 mm')));
 assert.ok(auditA5PageBounds([{...valid,id:'C',scrollHeight:192*px}],px).some(x=>x.includes('190 mm')));
 assert.ok(auditA5PageBounds([valid],0).some(x=>x.includes('skalierung')));
});


test('Doppelte Umschlagkennungen und ungültige Blattzahlen sperren den Druck',()=>{
 const sheets=[{envelopeId:'A',kind:'task'},{envelopeId:'A',kind:'route',routePage:1}];
 assert.ok(auditRenderedEnvelopes([{id:'A',sheetCount:2},{id:'A',sheetCount:2}],sheets).some(x=>x.includes('doppelte Umschlagkennungen')));
 for(const count of [0,1,-1,1.5,NaN,Infinity]){
  assert.ok(auditRenderedEnvelopes([{id:'A',sheetCount:count}],sheets).some(x=>x.includes('ungültige Anzahl Kinderblätter')));
 }
 assert.ok(auditRenderedEnvelopes([{id:'',sheetCount:2}],[]).some(x=>x.includes('leere Umschlagkennung')));
});

test('Etikettenprüfung akzeptiert keine doppelten oder leeren Manifestkennungen',()=>{
 assert.ok(auditRenderedLabels([{id:'A',sheetCount:2},{id:'A',sheetCount:2}],['A','A']).some(x=>x.includes('doppelte Umschlagkennungen')));
 assert.ok(auditRenderedLabels([{id:'',sheetCount:2}],['']).some(x=>x.includes('leere Umschlagkennung')));
});

test('Widersprüchliche Druckmanifest-Summen und ungültige Sollwerte sperren die Freigabe',()=>{
 const actual={total:53,organizer:14,children:36,labels:3};
 assert.ok(auditRenderedPrintCategories({minimumSheets:53,organizerSheets:13,taskSheets:36,labelSheets:3},actual).some(x=>x.includes('Blattkategorien')));
 assert.ok(auditRenderedPrintCategories({minimumSheets:53,organizerSheets:-1,taskSheets:51,labelSheets:3},actual).some(x=>x.includes('ungültige erwartete')));
 assert.ok(auditRenderedPrintCategories({minimumSheets:53,organizerSheets:14.5,taskSheets:35.5,labelSheets:3},actual).some(x=>x.includes('ungültige erwartete')));
});

test('Ungültig große Blattzahlen erzeugen keine unbegrenzten Prüflisten',()=>{
 const sheets=[{envelopeId:'A',kind:'task'},{envelopeId:'A',kind:'route',routePage:1}];
 for(const count of [Number.MAX_SAFE_INTEGER+1,Infinity,NaN,-100]){
  const issues=auditRenderedEnvelopes([{id:'A',sheetCount:count}],sheets);
  assert.ok(issues.some(x=>x.includes('ungültige Anzahl Kinderblätter')));
  assert.ok(issues.length<10);
 }
});

test('Extrem große gültige Einzelblattzahl wird vor der Sequenzbildung begrenzt',()=>{
 const actual=[{envelopeId:'A',kind:'task'},{envelopeId:'A',kind:'route',routePage:1}];
 const issues=auditRenderedEnvelopes([{id:'A',sheetCount:Number.MAX_SAFE_INTEGER}],actual);
 assert.ok(issues.some(issue=>issue.includes('Umschlag-Reihenfolge')));
 assert.ok(issues.length<10);
});

test('A5-Geometriedatensätze ohne Blattkennung werden abgewiesen',()=>{
 const px=96/25.4;
 const sheet={id:'',contentWidth:120*px,contentHeight:180*px,scrollWidth:120*px,scrollHeight:180*px};
 assert.ok(auditA5PageBounds([sheet],px).some(issue=>issue.includes('ohne Kennung')));
});

test('Doppelte A5-Blattkennungen verhindern die geometrische Freigabe',()=>{
 const px=96/25.4;
 const sheet={id:'A',contentWidth:120*px,contentHeight:180*px,scrollWidth:120*px,scrollHeight:180*px};
 assert.ok(auditA5PageBounds([sheet,{...sheet}],px).some(issue=>issue.includes('doppelte Blattkennungen')));
 assert.deepEqual(auditA5PageBounds([sheet,{...sheet,id:'B'}],px),[]);
});

test('Leere A5-Geometriemessung darf nicht als erfolgreich gelten',()=>{
 const px=96/25.4;
 assert.ok(auditPrintOverflow([]).some(issue=>issue.includes('Keine A5-Blätter')));
 assert.ok(auditA5PageBounds([],px).some(issue=>issue.includes('Keine A5-Blätter')));
});

test('Packliste und Etiketten müssen exakt zum Umschlagplan passen',()=>{
 const expected=[
  {envelopeId:'0-a',team:'Rot',stationName:'Wiese',stationNumber:1,sheetCount:2},
  {envelopeId:'1-b',team:'Blau',stationName:'Platz',stationNumber:2,sheetCount:4}
 ];
 assert.deepEqual(auditRenderedPackingItems(expected,expected,expected),[]);
 for(const field of ['envelopeId','team','stationName','stationNumber','sheetCount']){
  const wrong=expected.map(item=>({...item}));
  wrong[0][field]=typeof wrong[0][field]==='number'?99:'Falsch';
  assert.ok(auditRenderedPackingItems(expected,wrong,expected).some(issue=>issue.includes('Etiketten')),field);
  assert.ok(auditRenderedPackingItems(expected,expected,wrong).some(issue=>issue.includes('Packliste')),field);
 }
 assert.ok(auditRenderedPackingItems(expected,[expected[0],expected[0]],expected).some(issue=>issue.includes('doppelte')));
 assert.ok(auditRenderedPackingItems(expected,expected.slice(1),expected).some(issue=>issue.includes('von 2')));
 assert.ok(auditRenderedPackingItems(expected,[...expected].reverse(),expected).some(issue=>issue.includes('einsortiert')));
});

test('A5 Packdaten ohne gueltige Nummern oder Namen verhindern Druck',()=>{
 const good={envelopeId:'0-a',team:'Rot',stationName:'Wiese',stationNumber:1,sheetCount:2};
 for(const [field,value] of [['envelopeId',' '],['team',''],['stationName',' '],['stationNumber',NaN],['stationNumber',1.5],['sheetCount',1],['sheetCount',Infinity],['team',' Rot '],['stationName','Wiese ']]){
  const changed={...good,[field]:value};
  assert.ok(auditRenderedPackingItems([good],[changed],[good]).some(issue=>issue.includes('ungültige Packdaten')),field);
 }
});

test('Ungueltige erwartete A5 Packdaten duerfen nicht durch identische Druckdaten durchrutschen',()=>{
 const good={envelopeId:'0-a',team:'Rot',stationName:'Wiese',stationNumber:1,sheetCount:2};
 for(const [field,value] of [['envelopeId',' '],['team',''],['stationName',''],['stationNumber',0],['stationNumber',NaN],['sheetCount',1],['sheetCount',Infinity],['team',' Rot '],['stationName','Wiese ']]){
  const corrupt={...good,[field]:value};
  assert.ok(auditRenderedPackingItems([corrupt],[corrupt],[corrupt]).some(issue=>issue.includes('Druckmanifest: Umschlag 1 enthält ungültige Packdaten')),field);
 }
 assert.ok(auditRenderedPackingItems([good,good],[good,good],[good,good]).some(issue=>issue.includes('Druckmanifest: doppelte Umschlagkennung')));
});

test('Spielleitungs-Packliste muss echte Codes und Zielorte enthalten',()=>{
 const expected=[
  {envelopeId:'0-a',code:'007',destination:'Spielplatz'},
  {envelopeId:'1-b',code:'000',destination:'Zuhause'}
 ];
 assert.deepEqual(auditRenderedOrganizerSecrets(expected,expected),[]);
 for(const [field,value] of [['code','123'],['code','7'],['code',''],['destination','Andere Wiese'],['destination',' '],['envelopeId','1-b']]){
  const wrong=expected.map(item=>({...item}));
  wrong[0][field]=value;
  assert.ok(auditRenderedOrganizerSecrets(expected,wrong).length>0,field+': '+value);
 }
 assert.ok(auditRenderedOrganizerSecrets(expected,expected.slice(1)).length>0);
 assert.ok(auditRenderedOrganizerSecrets(expected,[expected[0],expected[0]]).some(issue=>issue.includes('doppelte')));
});

test('Spielleitungs-Packliste prueft Schloss-Code und naechstes Ziel je Umschlag',()=>{
 const expected=[
  {envelopeId:'0-a',code:'007',destination:'Wiese'},
  {envelopeId:'1-b',code:'000',destination:'Zuhause'}
 ];
 assert.deepEqual(auditRenderedOrganizerSecrets(expected,expected),[]);
 for(const [field,value] of [['code','123'],['code','7'],['code','abc'],['destination','Falscher Ort'],['destination',' Wiese '],['envelopeId','falsch']]){
  const changed=expected.map(item=>({...item}));
  changed[0][field]=value;
  assert.ok(auditRenderedOrganizerSecrets(expected,changed).length>0,field+': '+value);
 }
 assert.ok(auditRenderedOrganizerSecrets(expected,expected.slice(1)).length>0);
 assert.ok(auditRenderedOrganizerSecrets(expected,[expected[0],expected[0]]).some(issue=>issue.includes('doppelte')));
});

test('Spielleitungsdaten mit identischen falschen Codes werden nicht freigegeben',()=>{
 for(const code of ['7','abcd',' 007','12x']){
  const invalid={envelopeId:'0-a',code,destination:'Wiese'};
  assert.ok(auditRenderedOrganizerSecrets([invalid],[invalid]).some(issue=>issue.includes('ungültige erwartete Daten')),code);
 }
 const duplicate={envelopeId:'0-a',code:'007',destination:'Wiese'};
 assert.ok(auditRenderedOrganizerSecrets([duplicate,duplicate],[duplicate,duplicate]).some(issue=>issue.includes('doppelte erwartete')));
});
