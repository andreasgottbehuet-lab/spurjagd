import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlan} from '../src/generator.ts';
import {createPrintManifest, ROUTE_QUESTIONS_PER_A5_SHEET, routeSheetCount} from '../src/print-manifest.ts';
import {auditPrintManifest} from '../src/print-manifest-audit.ts';
import {generateCreativeRouteClue,verifyRouteQuestions,normalizeSolutionWord} from '../src/puzzles.ts';
const config={players:12,groupSize:3,durationMinutes:60,age:'8–10',goal:'locks',locations:[{id:'a',name:'Spielplatz',description:''},{id:'b',name:'Wiese',description:''},{id:'c',name:'Feuerwehr',description:''},{id:'d',name:'Sportplatz',description:''}],puzzleMinutes:10,walkingMinutes:5,startFinishMinutes:10,meetingPoint:'Zuhause'};
test('Vier Gruppen mit drei Stationen brauchen 12 Umschläge und 36 Aufgabenblätter',()=>{const m=createPrintManifest(createPlan(config));assert.equal(m.envelopes.length,12);assert.equal(m.taskSheets,36);assert.ok(m.envelopes.every(e=>e.sheetCount===3));assert.equal(new Set(m.envelopes.map(e=>e.id)).size,m.envelopes.length);assert.equal(m.labelSheets,3);assert.equal(m.organizerSheets,13);assert.equal(m.minimumSheets,52);});
test('Umschläge zeigen je Gruppe die korrekte Station und das korrekte Ziel',()=>{const plan=createPlan({...config,routeMode:'varied'});const m=createPrintManifest(plan);for(const team of plan.teams){for(let i=0;i<team.stations.length;i++){const e=m.envelopes.find(x=>x.team===team.name&&x.stationNumber===i+1);assert.equal(e.stationId,team.stations[i].id);assert.equal(e.destination,team.stations[i+1]?.name??team.finish);}}});

test('Vollständige A5-Druckpakete bestehen die Plausibilitätsprüfung',()=>{const plan=createPlan(config);assert.deepEqual(auditPrintManifest(plan,createPrintManifest(plan)),[]);});
test('Fehlende Umschläge und falsche Ziele verhindern die Druckfreigabe',()=>{const plan=createPlan(config);const manifest=createPrintManifest(plan);manifest.envelopes[0].destination='Falscher Ort';assert.ok(auditPrintManifest(plan,manifest).some(x=>x.includes('Zielort')));manifest.envelopes.pop();assert.ok(auditPrintManifest(plan,manifest).some(x=>x.includes('Umschlaganzahl')));});
test('Doppelte Kennungen und falsche Blattanzahl werden erkannt',()=>{const plan=createPlan(config);const manifest=createPrintManifest(plan);manifest.envelopes[1].id=manifest.envelopes[0].id;manifest.taskSheets=1;assert.ok(auditPrintManifest(plan,manifest).some(x=>x.includes('eindeutig')));assert.ok(auditPrintManifest(plan,manifest).some(x=>x.includes('Aufgabenblätter')));});

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
 assert.equal(m.organizerSheets,13);
 m.organizerSheets=1;
 assert.ok(auditPrintManifest(plan,m).some(issue=>issue.includes('Spielleitungsseiten')));
});

test('Gesamtumfang wird unabhängig berechnet',()=>{const plan=createPlan(config),m=createPrintManifest(plan);m.taskSheets+=3;m.minimumSheets+=3;assert.ok(auditPrintManifest(plan,m).some(x=>x.includes('Mindestumfang')));});

test('Vertauschte Umschlagnummern werden erkannt',()=>{const plan=createPlan(config),m=createPrintManifest(plan);[m.envelopes[0].stationNumber,m.envelopes[1].stationNumber]=[m.envelopes[1].stationNumber,m.envelopes[0].stationNumber];assert.ok(auditPrintManifest(plan,m).length>0);});

test('Veränderte Etikettenreihenfolge wird erkannt',()=>{const plan=createPlan(config),m=createPrintManifest(plan);m.envelopes.reverse();assert.ok(auditPrintManifest(plan,m).some(x=>x.includes('Umschlagreihenfolge')));});

test('Dynamischer Druckumfang berücksichtigt unterschiedliche Gruppenzahlen',()=>{for(const players of [1,3,12,24,60,100]){const plan=createPlan({...config,players});const m=createPrintManifest(plan);const routes=Math.ceil(plan.teams.length/2);const codes=Math.ceil(new Set(plan.teams.flatMap(t=>t.stations.map(s=>s.id))).size/2);const destinations=new Set(plan.teams.flatMap(t=>t.stations.map((_,i)=>t.stations[i+1]?.name??t.finish))).size;assert.equal(m.organizerSheets,routes+codes+destinations+Math.ceil(m.envelopes.length/4)+1);assert.equal(m.minimumSheets,m.taskSheets+m.organizerSheets+m.labelSheets);assert.deepEqual(auditPrintManifest(plan,m),[]);}});

test('Lange Fragenrätsel erhalten zusätzliche A5-Blätter und korrekte Umschlagzahlen',()=>{
 const c={...config,locations:[{id:'a',name:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',description:''},{id:'b',name:'Wiese',description:''}],routeClueModes:{a:'questions'},durationMinutes:60};
 const plan=createPlan(c),m=createPrintManifest(plan,c);
 assert.ok(m.envelopes.some(e=>e.sheetCount>3));
 assert.ok(m.organizerSheets>createPrintManifest(plan).organizerSheets,'Auch der Lösungsschlüssel benötigt Fortsetzungsblätter');
 assert.equal(m.taskSheets,m.envelopes.reduce((sum,e)=>sum+e.sheetCount,0));
 assert.deepEqual(auditPrintManifest(plan,m,c),[]);
 const broken=createPrintManifest(plan,c);
 broken.envelopes.find(e=>e.sheetCount>3).sheetCount=3;
 assert.ok(auditPrintManifest(plan,broken,c).some(issue=>issue.includes('Anzahl A5-Blätter')));
});

test('Fragenrätsel werden in Fünferblöcke aufgeteilt',()=>{const c={...config,routeClueModes:{a:'questions'}};assert.equal(ROUTE_QUESTIONS_PER_A5_SHEET,5);assert.equal(routeSheetCount('Spielplatz',c),2);assert.equal(routeSheetCount('ABCDEFGHIJKLMNOPQRSTUVWXYZ',{...c,locations:[{id:'a',name:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',description:''}]}),6);});

test('Umlautnamen werden für A5-Fragenseiten korrekt gezählt',()=>{const c={...config,locations:[{id:'a',name:'Ärger',description:''}],routeClueModes:{a:'questions'}};assert.equal(routeSheetCount('Ärger',c),2);assert.equal(routeSheetCount('Ärger',{...c,routeClueModes:{a:'letters'}}),1);});

test('Zusätzliche Wegrätselseiten erhöhen Kinder- und Spielleitungsumfang gemeinsam',()=>{const c={...config,locations:[{id:'a',name:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',description:''},{id:'b',name:'Wiese',description:''}],routeClueModes:{a:'questions'}};const plan=createPlan(c);const normal=createPrintManifest(plan);const extended=createPrintManifest(plan,c);const affected=extended.envelopes.filter(e=>e.destination==='ABCDEFGHIJKLMNOPQRSTUVWXYZ');assert.ok(affected.length>0);assert.ok(affected.every(e=>e.sheetCount===8));assert.equal(extended.taskSheets-normal.taskSheets,affected.length*5);assert.equal(extended.organizerSheets-normal.organizerSheets,5);assert.deepEqual(auditPrintManifest(plan,extended,c),[]);});

test('Unterschiedliche Gruppenrouten zählen jeden Zielort im Lösungsschlüssel nur einmal',()=>{const c={...config,routeMode:'varied',startMode:'distributed'};const plan=createPlan(c);const m=createPrintManifest(plan,c);const destinations=new Set(plan.teams.flatMap(team=>team.stations.map((_,i)=>team.stations[i+1]?.name??team.finish)));const stations=new Set(plan.teams.flatMap(team=>team.stations.map(station=>station.id)));assert.equal(m.organizerSheets,Math.ceil(plan.teams.length/2)+Math.ceil(stations.size/2)+destinations.size+Math.ceil(m.envelopes.length/4)+1);assert.deepEqual(auditPrintManifest(plan,m,c),[]);});

test('Leerzeichen am Stationsnamen verändern die Fragenrätsel-Seitenzahl nicht',()=>{const c={...config,locations:[{id:'a',name:'  Spielplatz  ',description:''}],routeClueModes:{a:'questions'}};assert.equal(routeSheetCount('Spielplatz',c),2);assert.equal(routeSheetCount(' Spielplatz ',c),2);});

test('Fehlende Spielleitungs-Fortsetzungsseite blockiert Druckfreigabe',()=>{const c={...config,locations:[{id:'a',name:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',description:''},{id:'b',name:'Wiese',description:''}],routeClueModes:{a:'questions'}};const plan=createPlan(c);const m=createPrintManifest(plan,c);m.organizerSheets--;assert.ok(auditPrintManifest(plan,m,c).some(issue=>issue.includes('Spielleitungsseiten')));});

test('Kontrollliste erhält pro vier Umschläge ein eigenes A5-Blatt',()=>{const plan=createPlan(config);const m=createPrintManifest(plan,config);assert.equal(m.envelopes.length,12);assert.equal(m.organizerSheets,13);assert.deepEqual(auditPrintManifest(plan,m,config),[]);});

test('Druckmanifest bleibt bei verschiedenen Gruppengrößen, Stationszahlen und Routen konsistent',()=>{
 for(const players of [1,2,7,12,25,100]){
  for(const groupSize of [1,3,10]){
   for(const locationCount of [1,2,4,8,20]){
    for(const routeMode of ['same','varied']){
     const locations=Array.from({length:locationCount},(_,i)=>({id:'ort-'+i,name:'Ort '+i,description:''}));
     const c={...config,players,groupSize,locations,routeMode,durationMinutes:180};
     const plan=createPlan(c),manifest=createPrintManifest(plan,c);
     assert.deepEqual(auditPrintManifest(plan,manifest,c),[],players+' / '+groupSize+' / '+locationCount+' / '+routeMode);
     assert.equal(manifest.envelopes.length,plan.teams.reduce((n,team)=>n+team.stations.length,0));
     assert.equal(manifest.minimumSheets,manifest.taskSheets+manifest.organizerSheets+manifest.labelSheets);
     const visited=new Set(plan.teams.flatMap(team=>team.stations.map(station=>station.id))).size;
     const destinations=new Set(plan.teams.flatMap(team=>team.stations.map((_,i)=>team.stations[i+1]?.name??team.finish))).size;
     const expectedOrganizer=Math.ceil(plan.teams.length/2)+Math.ceil(visited/2)+destinations+Math.ceil(manifest.envelopes.length/4)+1;
     assert.equal(manifest.organizerSheets,expectedOrganizer);
     assert.ok(manifest.envelopes.every(envelope=>envelope.sheetCount>=3));
    }
   }
  }
 }
});

test('Maximal langer Zielname mit 80 Buchstaben bleibt innerhalb der Blattzählung',()=>{
 const destination='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(3)+'AB';
 assert.equal(destination.length,80);
 const c={...config,locations:[{id:'a',name:destination,description:''},{id:'b',name:'Wiese',description:''}],routeClueModes:{a:'questions'}};
 const plan=createPlan(c),manifest=createPrintManifest(plan,c);
 assert.equal(routeSheetCount(destination,c),16);
 const clue=generateCreativeRouteClue(destination,'','questions',1234);
 assert.equal(clue.rows.length,80);
 assert.ok(verifyRouteQuestions(clue));
 assert.equal(Math.ceil(normalizeSolutionWord(clue.answer).length/ROUTE_QUESTIONS_PER_A5_SHEET),16);
 assert.ok(manifest.envelopes.some(envelope=>envelope.destination===destination && envelope.sheetCount===18));
 assert.deepEqual(auditPrintManifest(plan,manifest,c),[]);
});
